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
  platform?: string;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[SEND-PUSH] ${step}`, details ? JSON.stringify(details) : "");
};

// Send Web Push notification (for PWA/browsers)
async function sendWebPush(
  sub: DecryptedSubscription,
  payload: string,
  vapidPublicKey: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const response = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "TTL": "86400",
        "Urgency": "high",
        "Crypto-Key": `p256ecdsa=${vapidPublicKey}`,
      },
      body: payload,
    });

    if (response.ok || response.status === 201) {
      return { success: true, status: response.status };
    }

    const responseText = await response.text();
    return { 
      success: false, 
      status: response.status, 
      error: responseText.substring(0, 200) 
    };
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : "Unknown error" 
    };
  }
}

// Send FCM notification (for native Android apps)
async function sendFCMPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");
  
  if (!fcmServerKey) {
    logStep("WARNING: FCM_SERVER_KEY not configured, skipping Android push");
    return { success: false, error: "FCM_SERVER_KEY not configured" };
  }

  try {
    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `key=${fcmServerKey}`,
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title,
          body,
          icon: "ic_notification",
          sound: "default",
          android_channel_id: "declutter_channel",
        },
        data: data || { url: "/" },
        priority: "high",
      }),
    });

    const result = await response.json();
    
    if (result.success === 1) {
      return { success: true };
    }
    
    if (result.failure === 1 && result.results?.[0]?.error) {
      return { success: false, error: result.results[0].error };
    }

    return { success: false, error: JSON.stringify(result) };
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : "Unknown error" 
    };
  }
}

// Send APNs notification (for native iOS apps) - placeholder for future implementation
async function sendAPNsPush(
  token: string,
  title: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  // APNs requires more complex setup with Apple certificates
  // This is a placeholder - full implementation requires:
  // 1. APNs Auth Key (.p8 file) or Push Certificate
  // 2. Key ID and Team ID from Apple Developer
  // 3. JWT token generation for APNs authentication
  logStep("WARNING: iOS APNs not fully implemented", { token: token.substring(0, 20) });
  return { 
    success: false, 
    error: "iOS APNs not implemented - use Firebase Cloud Messaging for iOS instead" 
  };
}

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

    // Check for service key in header (for cron/scheduled calls)
    const serviceKeyHeader = req.headers.get("X-Service-Key");
    const isServiceCall = serviceKeyHeader === supabaseServiceKey;
    
    // Validate service calls don't come from browser origins
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
      
      if (!token || token.length < 10) {
        logStep("ERROR: Invalid token format");
        return new Response(
          JSON.stringify({ error: "Unauthorized - invalid token format" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });

      const { data: userData, error: userError } = await supabaseUser.auth.getUser();
      
      if (userError) {
        logStep("ERROR: Invalid token", { error: userError.message });
        return new Response(
          JSON.stringify({ error: `Unauthorized - ${userError.message}` }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (!userData?.user) {
        logStep("ERROR: No user in token");
        return new Response(
          JSON.stringify({ error: "Unauthorized - no user found" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = userData.user.id;
      logStep("Authenticated user", { userId });

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
      platforms: filteredSubs.map(s => s.platform || "web")
    });

    if (filteredSubs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, failed: 0, message: "No active subscriptions found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const notificationTitle = title || "odgruzuj.pl";
    const notificationBody = body || "Czas na porządki! 🧹";

    const webPayload = JSON.stringify({
      title: notificationTitle,
      body: notificationBody,
      icon: "/favicon.jpg",
      data: { url: "/" },
    });

    let successCount = 0;
    let failCount = 0;

    for (const sub of filteredSubs) {
      const platform = sub.platform || "web";
      logStep("Sending to subscription", { 
        platform,
        endpoint: sub.endpoint.substring(0, 60) + "..."
      });

      let result: { success: boolean; status?: number; error?: string };

      switch (platform) {
        case "android":
          // FCM token is stored in endpoint field for Android
          result = await sendFCMPush(sub.endpoint, notificationTitle, notificationBody);
          break;
        
        case "ios":
          // APNs token is stored in endpoint field for iOS
          result = await sendAPNsPush(sub.endpoint, notificationTitle, notificationBody);
          break;
        
        default:
          // Web Push (PWA/browsers)
          result = await sendWebPush(sub, webPayload, vapidPublicKey);
          break;
      }

      if (result.success) {
        successCount++;
        logStep("Push sent successfully", { platform, status: result.status });
      } else {
        failCount++;
        logStep("Push failed", { platform, error: result.error });
        
        // Mark subscription as inactive if expired (404/410 for web, specific FCM errors)
        const expiredErrors = ["NotRegistered", "InvalidRegistration"];
        if (
          result.status === 404 || 
          result.status === 410 ||
          (result.error && expiredErrors.includes(result.error))
        ) {
          await supabaseAdmin
            .from("push_subscriptions")
            .update({ is_active: false })
            .eq("id", sub.id);
          logStep("Marked subscription as inactive", { id: sub.id });
        }
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
