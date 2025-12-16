import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fallback price IDs (used if database fetch fails)
const FALLBACK_PRICE_IDS = {
  monthly: "price_1ScWPE9EWMAAADcflIpPIPRS",
  yearly: "price_1ScWRg9EWMAAADcfHNoeUUK7",
};

// Zod schema for input validation
const CheckoutSchema = z.object({
  plan: z.enum(['monthly', 'yearly']).default('yearly'),
});

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use anon key for user authentication
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  // Use service role for reading protected config
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const body = await req.json();
    const { plan } = CheckoutSchema.parse(body);

    logStep("Plan selected", { plan });

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Fetch price IDs from database
    let priceId: string;
    try {
      const priceKey = plan === 'monthly' ? 'price_monthly' : 'price_yearly';
      // Use admin client to bypass RLS
      const { data: configData, error: configError } = await supabaseAdmin
        .from('stripe_config')
        .select('value')
        .eq('key', priceKey)
        .single();

      if (configError || !configData?.value) {
        logStep("Using fallback price ID", { plan, reason: configError?.message });
        priceId = FALLBACK_PRICE_IDS[plan];
      } else {
        priceId = configData.value;
        logStep("Price ID from database", { priceId });
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

    logStep("Using price", { priceId, plan });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      // Stripe will automatically show card + Apple Pay/Google Pay
      // Note: BLIK and P24 don't support subscriptions, only one-time payments
      success_url: `${req.headers.get("origin")}/settings?upgrade=success`,
      cancel_url: `${req.headers.get("origin")}/settings?upgrade=cancelled`,
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
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
