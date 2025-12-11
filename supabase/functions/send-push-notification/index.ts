import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DecryptedSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  auth: string;
  p256dh: string;
  is_active: boolean;
  notification_time: string;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[SEND-PUSH] ${step}`, details ? JSON.stringify(details) : "");
};

const handler = async (req: Request): Promise<Response> => {
  logStep("Function started");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    if (!vapidPublicKey) {
      logStep("ERROR: VAPID public key not configured");
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check for service key in header (for cron/scheduled calls) - more secure than request body
    const serviceKeyHeader = req.headers.get("X-Service-Key");
    const isServiceCall = serviceKeyHeader === supabaseServiceKey;
    
    // Validate service calls don't come from browser origins (internal only)
    if (isServiceCall) {
      const origin = req.headers.get("origin");
      if (origin !== null) {
        logStep("ERROR: Service call with browser origin rejected");
        return new Response(
          JSON.stringify({ error: "Invalid origin for service call" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Parse request body
    let requestBody: { 
      userId?: string; 
      targetUserId?: string; 
      title?: string; 
      body?: string; 
      sendToAll?: boolean;
    } = {};
    
    try {
      requestBody = await req.json();
    } catch {
      requestBody = {};
    }
    
    if (!isServiceCall) {
      // Verify user authorization
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        logStep("ERROR: No authorization header");
        return new Response(
          JSON.stringify({ error: "Unauthorized - no authorization header" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const token = authHeader.replace("Bearer ", "");
      
      // Create a client with the user's token to verify their identity
      const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });

      const { data: userData, error: userError } = await supabaseUser.auth.getUser();
      
      if (userError || !userData?.user) {
        logStep("ERROR: Invalid token", { error: userError?.message });
        return new Response(
          JSON.stringify({ error: "Unauthorized - invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = userData.user.id;
      logStep("Authenticated user", { userId });

      // Check if user has admin role using the has_role function
      const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc("has_role", {
        _user_id: userId,
        _role: "admin"
      });

      if (roleError) {
        logStep("ERROR: Checking admin role failed", { error: roleError.message });
        return new Response(
          JSON.stringify({ error: "Error verifying permissions" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!isAdmin) {
        logStep("ERROR: User is not admin", { userId });
        return new Response(
          JSON.stringify({ error: "Forbidden - admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      logStep("Admin authorization verified", { userId });
    } else {
      logStep("Service call authorized");
    }

    const { targetUserId, title, body, sendToAll } = requestBody;
    logStep("Request params", { targetUserId, title, body, sendToAll });

    // Use the secure function to get decrypted subscriptions
    const { data: subscriptions, error: subsError } = await supabaseAdmin.rpc(
      "get_push_subscriptions_decrypted"
    );

    if (subsError) {
      logStep("ERROR: Fetching subscriptions failed", { error: subsError.message });
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter subscriptions
    let filteredSubs = (subscriptions as DecryptedSubscription[]) || [];
    filteredSubs = filteredSubs.filter(sub => sub.is_active);
    
    if (!sendToAll && targetUserId) {
      filteredSubs = filteredSubs.filter(sub => sub.user_id === targetUserId);
    }

    logStep("Found active subscriptions", { 
      count: filteredSubs.length,
      decrypted: filteredSubs.map(s => ({
        hasEndpoint: !!s.endpoint,
        hasAuth: !!s.auth && s.auth.length > 10,
        hasP256dh: !!s.p256dh && s.p256dh.length > 10
      }))
    });

    if (filteredSubs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, failed: 0, message: "No active subscriptions found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title: title || "odgruzuj.pl",
      body: body || "Czas na porządki! 🧹",
      icon: "/favicon.jpg",
      data: { url: "/" },
    });

    let successCount = 0;
    let failCount = 0;

    for (const sub of filteredSubs) {
      try {
        logStep("Sending to subscription", { 
          endpoint: sub.endpoint.substring(0, 60) + "...",
          authLength: sub.auth?.length || 0,
          p256dhLength: sub.p256dh?.length || 0
        });

        // Send push notification with VAPID public key header
        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "TTL": "86400",
            "Urgency": "normal",
            "Crypto-Key": `p256ecdsa=${vapidPublicKey}`,
          },
          body: payload,
        });

        if (response.ok || response.status === 201) {
          successCount++;
          logStep("Push sent successfully", { 
            endpoint: sub.endpoint.substring(0, 30),
            status: response.status 
          });
        } else {
          const responseText = await response.text();
          logStep("Push failed", { 
            status: response.status, 
            statusText: response.statusText,
            endpoint: sub.endpoint.substring(0, 40),
            response: responseText.substring(0, 300)
          });
          failCount++;
          
          // Mark failed subscription as inactive if 404 or 410 (expired)
          if (response.status === 404 || response.status === 410) {
            await supabaseAdmin
              .from("push_subscriptions")
              .update({ is_active: false })
              .eq("id", sub.id);
            logStep("Marked subscription as inactive", { id: sub.id });
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        logStep("Push error", { endpoint: sub.endpoint.substring(0, 30), error: errorMessage });
        failCount++;
      }
    }

    logStep("Completed", { sent: successCount, failed: failCount });

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: failCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR: Unhandled exception", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
