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
  const timestamp = new Date().toISOString();
  console.log(`[SCHEDULED-PUSH ${timestamp}] ${step}`, details ? JSON.stringify(details) : "");
};

// Alarm titles in Polish
const alarmTitles = [
  "🚨 ALARM PORZĄDKOWY! 🚨",
  "⏰ CZAS NA AKCJĘ! ⏰",
  "🔔 DZWONI PORZĄDEK! 🔔",
  "📢 UWAGA! UWAGA! 📢",
  "🆘 CHAOS WYKRYTY! 🆘",
  "⚡ MISJA PORZĄDKOWA! ⚡",
];

// Funny motivational comments in Polish
const funnyComments = [
  "Twoja szuflada płacze po nocach... Idź ją pocieszyć! 😭",
  "Kurz właśnie zapytał czy może zostać na stałe. Powiedz mu NIE! 🙅‍♂️",
  "Rupieciki szepcą: 'Uwolnij nas!' Czas działać! 🗣️",
  "Bałagan myśli że wygrał. Udowodnij mu że się myli! 💪",
  "Szafa pęka w szwach! Ratuj sytuację! 🆘",
  "Twoje przyszłe ja będzie Ci dzisiaj dziękować! 🙏",
  "15 minut i jesteś bohaterem! Pluszowy miś wierzy w Ciebie! 🧸",
  "Graty muszą odejść. Jesteś ich egzorcystą! 👻",
  "Chaos level: OVER 9000! Czas obniżyć! 📉",
  "Porządek zaprasza na kawę. Przyjmij zaproszenie! ☕",
  "Dziś wyrzucisz coś, czego nawet nie pamiętasz! 🤔",
  "Twój kącik chce wyglądać jak z Pinteresta! 📸",
  "Minimalizm dzwoni. Odbierz! 📞",
  "Mniej rzeczy = więcej miejsca na szczęście! 🌈",
  "Nawet 5 minut robi różnicę! No dalej! 🚀",
];

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

// Send APNs notification (for native iOS apps) - placeholder
async function sendAPNsPush(
  token: string,
  title: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  logStep("WARNING: iOS APNs not fully implemented", { token: token.substring(0, 20) });
  return { 
    success: false, 
    error: "iOS APNs not implemented - use Firebase Cloud Messaging for iOS instead" 
  };
}

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

    // Verify this is a legitimate cron call
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

    // Get all active subscriptions
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
      const subTime = sub.notification_time.substring(0, 5);
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

    // Get decrypted subscriptions using service role
    const { data: decryptedSubs, error: decryptError } = await supabaseAdmin.rpc(
      "get_push_subscriptions_decrypted_service"
    );

    let subsToUse: DecryptedSubscription[] = [];
    
    if (decryptError) {
      logStep("Note: Could not use decrypted function, using raw subscriptions", { 
        error: decryptError.message 
      });
      subsToUse = matchingSubscriptions.map(s => ({
        id: s.id,
        user_id: s.user_id,
        endpoint: s.endpoint,
        auth: s.auth,
        p256dh: s.p256dh,
        is_active: s.is_active,
        notification_time: s.notification_time,
        platform: s.platform || "web"
      }));
    } else {
      const matchingIds = new Set(matchingSubscriptions.map(s => s.id));
      subsToUse = (decryptedSubs || []).filter((s: DecryptedSubscription) => matchingIds.has(s.id));
      // Add platform info from original subscriptions
      const platformMap = new Map(matchingSubscriptions.map(s => [s.id, s.platform || "web"]));
      subsToUse = subsToUse.map(s => ({ ...s, platform: platformMap.get(s.id) || "web" }));
    }

    logStep("Subscriptions to send", { 
      count: subsToUse.length,
      platforms: subsToUse.map(s => s.platform)
    });

    // Select random alarm title and funny comment
    const randomTitle = alarmTitles[Math.floor(Math.random() * alarmTitles.length)];
    const randomComment = funnyComments[Math.floor(Math.random() * funnyComments.length)];

    const webPayload = JSON.stringify({
      title: randomTitle,
      body: randomComment,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "declutter-alarm",
      renotify: true,
      requireInteraction: true,
      data: { url: "/" },
    });

    let successCount = 0;
    let failCount = 0;

    for (const sub of subsToUse) {
      const platform = sub.platform || "web";
      logStep("Sending notification", { 
        userId: sub.user_id,
        platform,
        endpoint: sub.endpoint.substring(0, 50) + "..."
      });

      let result: { success: boolean; status?: number; error?: string };

      switch (platform) {
        case "android":
          result = await sendFCMPush(sub.endpoint, randomTitle, randomComment);
          break;
        
        case "ios":
          result = await sendAPNsPush(sub.endpoint, randomTitle, randomComment);
          break;
        
        default:
          result = await sendWebPush(sub, webPayload, vapidPublicKey);
          break;
      }

      if (result.success) {
        successCount++;
        logStep("Push sent successfully", { userId: sub.user_id, platform });
      } else {
        failCount++;
        logStep("Push failed", { userId: sub.user_id, platform, error: result.error });
        
        // Mark subscription as inactive if expired
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
