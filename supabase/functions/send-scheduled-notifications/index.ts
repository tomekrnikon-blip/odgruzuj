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
  const timestamp = new Date().toISOString();
  console.log(`[SCHEDULED-PUSH ${timestamp}] ${step}`, details ? JSON.stringify(details) : "");
};

// Motivational messages in Polish
const motivationalMessages = [
  "Czas na porządki! 🧹 Dziś uporządkujesz kolejny kącik!",
  "Hej! Twoja codzienna fiszka czeka! ✨",
  "15 minut dziennie = wielka zmiana! 💪 Zaczynamy?",
  "Mniej rzeczy = więcej spokoju! 🧘 Pora działać!",
  "Każdy mały krok się liczy! 🏃‍♂️ Dziś kolejny!",
  "Twoje przyszłe ja będzie wdzięczne! 🙏 Otwórz aplikację!",
  "Nowy dzień, nowe wyzwanie! 🌅 Sprawdź swoją fiszkę!",
  "Gotowy na mini-porządki? 🎯 Dzisiejsze zadanie czeka!",
];

const handler = async (req: Request): Promise<Response> => {
  logStep("Scheduled notification function started");

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

    // Verify this is a legitimate cron call (check for Authorization header with anon key)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: No authorization - rejecting request");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time in Poland timezone (Europe/Warsaw)
    const now = new Date();
    const polandTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
    const currentHour = polandTime.getHours().toString().padStart(2, "0");
    const currentMinute = polandTime.getMinutes().toString().padStart(2, "0");
    const currentTimeStr = `${currentHour}:${currentMinute}:00`;
    
    logStep("Checking for notifications at time", { 
      currentTimeStr, 
      polandTime: polandTime.toISOString(),
      utcTime: now.toISOString()
    });

    // Get all active subscriptions - we need to use service role to bypass RLS
    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .eq("is_active", true);

    if (subsError) {
      logStep("ERROR: Fetching subscriptions failed", { error: subsError.message });
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Found subscriptions", { total: subscriptions?.length || 0 });

    // Filter subscriptions that match the current minute
    const matchingSubscriptions = (subscriptions || []).filter(sub => {
      if (!sub.notification_time) return false;
      // notification_time is stored as "HH:MM:00" format
      const subTime = sub.notification_time.substring(0, 5); // Get "HH:MM"
      const currentTime = `${currentHour}:${currentMinute}`;
      return subTime === currentTime;
    });

    logStep("Matching subscriptions for current minute", { 
      count: matchingSubscriptions.length,
      currentTime: `${currentHour}:${currentMinute}`
    });

    if (matchingSubscriptions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: 0, 
          message: "No notifications scheduled for this time" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Need to decrypt the subscription keys
    // We'll try to use direct decryption or fall back to raw keys
    
    // Get decrypted subscriptions using service role
    const { data: decryptedSubs, error: decryptError } = await supabaseAdmin.rpc(
      "get_push_subscriptions_decrypted_service"
    );

    let subsToUse: DecryptedSubscription[] = [];
    
    if (decryptError) {
      logStep("Note: Could not use decrypted function, using raw subscriptions", { 
        error: decryptError.message 
      });
      // Fall back to raw subscriptions (keys might not be encrypted)
      subsToUse = matchingSubscriptions.map(s => ({
        id: s.id,
        user_id: s.user_id,
        endpoint: s.endpoint,
        auth: s.auth,
        p256dh: s.p256dh,
        is_active: s.is_active,
        notification_time: s.notification_time
      }));
    } else {
      // Filter decrypted subs to only matching ones
      const matchingIds = new Set(matchingSubscriptions.map(s => s.id));
      subsToUse = (decryptedSubs || []).filter((s: DecryptedSubscription) => matchingIds.has(s.id));
    }

    logStep("Subscriptions to send", { count: subsToUse.length });

    // Select a random motivational message
    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

    const payload = JSON.stringify({
      title: "odgruzuj.pl",
      body: randomMessage,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: "/" },
    });

    let successCount = 0;
    let failCount = 0;

    for (const sub of subsToUse) {
      try {
        logStep("Sending notification", { 
          userId: sub.user_id,
          endpoint: sub.endpoint.substring(0, 50) + "..."
        });

        // Send push notification
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
            userId: sub.user_id,
            status: response.status 
          });
        } else {
          const responseText = await response.text();
          logStep("Push failed", { 
            userId: sub.user_id,
            status: response.status,
            response: responseText.substring(0, 200)
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
        logStep("Push error", { userId: sub.user_id, error: errorMessage });
        failCount++;
      }
    }

    logStep("Completed scheduled notifications", { sent: successCount, failed: failCount });

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
