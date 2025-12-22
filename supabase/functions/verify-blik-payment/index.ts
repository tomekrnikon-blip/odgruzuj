import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-BLIK-PAYMENT] ${step}${detailsStr}`);
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

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { expiresAt } = await req.json();
    if (!expiresAt) {
      throw new Error("Missing expiresAt parameter");
    }

    // Verify the payment was actually completed by checking Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find the most recent successful checkout session for this user
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      throw new Error("No customer found");
    }

    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    // Check for recent successful payment intents
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 5,
    });

    const recentSuccessfulPayment = paymentIntents.data.find((pi: { status: string; created: number }) => 
      pi.status === 'succeeded' && 
      pi.created > (Date.now() / 1000) - 3600 // Within last hour
    );

    if (!recentSuccessfulPayment) {
      logStep("No recent successful payment found");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "No recent payment found" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found successful payment", { paymentId: recentSuccessfulPayment.id });

    // Update user's subscription status in database
    const expiresAtDate = new Date(expiresAt);
    
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: 'active',
        subscription_expires_at: expiresAtDate.toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      logStep("ERROR: Failed to update profile", { error: updateError.message });
      throw new Error(`Failed to update subscription: ${updateError.message}`);
    }

    logStep("Subscription activated", { userId: user.id, expiresAt: expiresAtDate.toISOString() });

    return new Response(JSON.stringify({ 
      success: true, 
      expiresAt: expiresAtDate.toISOString() 
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
