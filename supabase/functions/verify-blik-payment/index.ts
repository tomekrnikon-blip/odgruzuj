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
  
  // Default to monthly
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

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    const requestBody = await req.json();
    const { expiresAt, duration } = requestBody;
    
    logStep("Request params", { expiresAt, duration });

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

    // Check for recent checkout sessions
    const sessions = await stripe.checkout.sessions.list({
      customer: customerId,
      limit: 10,
    });

    // Find the most recent completed session
    const recentCompletedSession = sessions.data.find((session: Stripe.Checkout.Session) => 
      session.payment_status === 'paid' && 
      session.created > (Date.now() / 1000) - 3600 // Within last hour
    );

    if (!recentCompletedSession) {
      // Fallback: check payment intents
      const paymentIntents = await stripe.paymentIntents.list({
        customer: customerId,
        limit: 5,
      });

      const recentSuccessfulPayment = paymentIntents.data.find((pi: Stripe.PaymentIntent) => 
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

      logStep("Found successful payment intent", { paymentId: recentSuccessfulPayment.id });
    } else {
      logStep("Found successful checkout session", { 
        sessionId: recentCompletedSession.id,
        metadata: recentCompletedSession.metadata 
      });
    }

    // Determine the correct expiration date
    let expiresAtDate: Date;
    let durationDays: number = duration ? parseInt(duration) : 30;

    // Try to get duration from session metadata first
    if (recentCompletedSession?.metadata?.duration_days) {
      durationDays = parseInt(recentCompletedSession.metadata.duration_days);
      logStep("Using duration from session metadata", { durationDays });
    } else if (recentCompletedSession?.metadata?.product_name) {
      durationDays = getDurationFromProductName(recentCompletedSession.metadata.product_name);
      logStep("Calculated duration from product name", { 
        productName: recentCompletedSession.metadata.product_name, 
        durationDays 
      });
    }

    // Get current profile to check existing expiration
    const { data: profileData } = await supabaseAdmin
      .from('profiles')
      .select('subscription_expires_at')
      .eq('user_id', user.id)
      .single();

    const now = new Date();

    if (expiresAt) {
      // Use provided expiresAt if available
      expiresAtDate = new Date(expiresAt);
      logStep("Using provided expiresAt", { expiresAt: expiresAtDate.toISOString() });
    } else if (profileData?.subscription_expires_at) {
      const currentExpiry = new Date(profileData.subscription_expires_at);
      if (currentExpiry > now) {
        // Extend from current expiry date
        expiresAtDate = new Date(currentExpiry.getTime() + (durationDays * 24 * 60 * 60 * 1000));
        logStep("Extending from current expiry", { expiresAt: expiresAtDate.toISOString() });
      } else {
        // Start fresh from today
        expiresAtDate = new Date(now.getTime() + (durationDays * 24 * 60 * 60 * 1000));
        logStep("Starting new period", { expiresAt: expiresAtDate.toISOString() });
      }
    } else {
      // No existing subscription, start from now
      expiresAtDate = new Date(now.getTime() + (durationDays * 24 * 60 * 60 * 1000));
      logStep("First subscription period", { expiresAt: expiresAtDate.toISOString() });
    }

    // Update user's subscription status in database
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

    logStep("Pro subscription activated successfully", { 
      userId: user.id, 
      expiresAt: expiresAtDate.toISOString(),
      durationDays,
      status: 'active'
    });

    return new Response(JSON.stringify({ 
      success: true, 
      expiresAt: expiresAtDate.toISOString(),
      durationDays,
      message: `Dostęp Pro aktywowany na ${durationDays} dni`
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
