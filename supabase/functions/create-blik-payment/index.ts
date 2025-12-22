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

// Subscription duration in days
const DURATION_DAYS = {
  monthly: 30,
  yearly: 365,
};

const PaymentSchema = z.object({
  plan: z.enum(['monthly', 'yearly']).default('yearly'),
});

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-BLIK-PAYMENT] ${step}${detailsStr}`);
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

    // Fetch one-time payment price IDs from database (BLIK-specific prices)
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

    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    // Calculate new expiration date
    const durationDays = DURATION_DAYS[plan];
    
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

    // Create one-time payment session with BLIK and P24 support
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
      payment_method_types: ["blik", "p24", "card"], // BLIK, Przelewy24, and card as fallback
      success_url: `${req.headers.get("origin")}/settings?blik=success&expires=${newExpiresAt.toISOString()}`,
      cancel_url: `${req.headers.get("origin")}/settings?blik=cancelled`,
      metadata: {
        user_id: user.id,
        plan: plan,
        new_expires_at: newExpiresAt.toISOString(),
      },
      locale: "pl", // Polish locale for BLIK interface
    });

    logStep("BLIK checkout session created", { sessionId: session.id, expiresAt: newExpiresAt.toISOString() });

    return new Response(JSON.stringify({ 
      url: session.url,
      expiresAt: newExpiresAt.toISOString(),
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
