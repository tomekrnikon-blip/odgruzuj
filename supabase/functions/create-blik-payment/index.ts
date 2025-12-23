import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fallback price IDs for BLIK one-time payments
const FALLBACK_PRICE_IDS = {
  monthly: "price_1ScWPE9EWMAAADcflIpPIPRS",
  yearly: "price_1ScWRg9EWMAAADcfHNoeUUK7",
};

const PaymentSchema = z.object({
  plan: z.enum(['monthly', 'yearly']).default('yearly'),
});

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-BLIK-PAYMENT] ${step}${detailsStr}`);
};

// Function to determine subscription duration from product name
const getDurationFromProductName = (productName: string): number => {
  const nameLower = productName.toLowerCase();
  
  // Check for yearly/annual keywords
  if (nameLower.includes('roczn') || nameLower.includes('rok') || 
      nameLower.includes('year') || nameLower.includes('annual') ||
      nameLower.includes('12 mies')) {
    return 365;
  }
  
  // Check for monthly keywords
  if (nameLower.includes('miesi') || nameLower.includes('month') || 
      nameLower.includes('30 dni') || nameLower.includes('1 mies')) {
    return 30;
  }
  
  // Default based on plan parameter
  return 30;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const body = await req.json();
    const { plan } = PaymentSchema.parse(body);
    logStep("Plan selected", { plan });

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Fetch one-time payment price IDs from database
    let priceId: string;
    try {
      const priceKey = plan === 'monthly' ? 'price_blik_monthly' : 'price_blik_yearly';
      const { data: configData, error: configError } = await supabaseAdmin
        .from('stripe_config')
        .select('value')
        .eq('key', priceKey)
        .single();

      if (configError || !configData?.value) {
        // Try to use regular price as fallback (for one-time mode)
        const regularKey = plan === 'monthly' ? 'price_monthly' : 'price_yearly';
        const { data: regularData } = await supabaseAdmin
          .from('stripe_config')
          .select('value')
          .eq('key', regularKey)
          .single();

        if (regularData?.value) {
          priceId = regularData.value;
          logStep("Using regular price ID for BLIK", { priceId });
        } else {
          priceId = FALLBACK_PRICE_IDS[plan];
          logStep("Using fallback price ID", { plan });
        }
      } else {
        priceId = configData.value;
        logStep("BLIK price ID from database", { priceId });
      }
    } catch (e) {
      logStep("Database error, using fallback", { error: String(e) });
      priceId = FALLBACK_PRICE_IDS[plan];
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Fetch product information to get the duration from product name
    const price = await stripe.prices.retrieve(priceId, {
      expand: ['product'],
    });
    
    let productName = "";
    let durationDays: number;
    
    if (price.product && typeof price.product !== 'string') {
      const product = price.product as Stripe.Product;
      productName = product.name || "";
      durationDays = getDurationFromProductName(productName);
      logStep("Product info retrieved", { productName, durationDays });
    } else {
      // Fallback to plan-based duration
      durationDays = plan === 'yearly' ? 365 : 30;
      logStep("Using plan-based duration", { plan, durationDays });
    }

    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    // Check if user has an existing subscription that hasn't expired yet
    const { data: profileData } = await supabaseAdmin
      .from('profiles')
      .select('subscription_expires_at')
      .eq('user_id', user.id)
      .single();

    let newExpiresAt: Date;
    const now = new Date();
    
    if (profileData?.subscription_expires_at) {
      const currentExpiry = new Date(profileData.subscription_expires_at);
      if (currentExpiry > now) {
        // Extend from current expiry date
        newExpiresAt = new Date(currentExpiry.getTime() + (durationDays * 24 * 60 * 60 * 1000));
        logStep("Extending existing subscription", { from: currentExpiry.toISOString(), to: newExpiresAt.toISOString() });
      } else {
        // Start fresh from today
        newExpiresAt = new Date(now.getTime() + (durationDays * 24 * 60 * 60 * 1000));
        logStep("Starting new subscription period", { expiresAt: newExpiresAt.toISOString() });
      }
    } else {
      // No existing subscription
      newExpiresAt = new Date(now.getTime() + (durationDays * 24 * 60 * 60 * 1000));
      logStep("First subscription", { expiresAt: newExpiresAt.toISOString() });
    }

    // Create one-time payment session with BLIK ONLY
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment", // One-time payment, NOT subscription
      payment_method_types: ["blik"], // ONLY BLIK - no other methods
      success_url: `${req.headers.get("origin")}/settings?blik=success&expires=${newExpiresAt.toISOString()}&duration=${durationDays}`,
      cancel_url: `${req.headers.get("origin")}/settings?blik=cancelled`,
      metadata: {
        user_id: user.id,
        plan: plan,
        product_name: productName,
        duration_days: durationDays.toString(),
        new_expires_at: newExpiresAt.toISOString(),
      },
      locale: "pl", // Polish locale for BLIK interface
    });

    logStep("BLIK checkout session created", { 
      sessionId: session.id, 
      expiresAt: newExpiresAt.toISOString(),
      productName,
      durationDays,
      paymentMethods: ["blik"]
    });

    return new Response(JSON.stringify({ 
      url: session.url,
      expiresAt: newExpiresAt.toISOString(),
      durationDays,
      productName,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
