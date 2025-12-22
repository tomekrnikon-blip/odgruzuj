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
  console.log(`[SUBSCRIPTION-REMINDER ${timestamp}] ${step}`, details ? JSON.stringify(details) : "");
};

// Reminder messages in Polish
const reminderTitles = {
  days7: "📅 Twoja subskrypcja wygasa za tydzień!",
  days3: "⚠️ Tylko 3 dni do końca subskrypcji!",
  days1: "🔔 Ostatni dzień subskrypcji!",
  expired: "❌ Twoja subskrypcja wygasła",
};

const reminderMessages = {
  days7: "Odnów teraz przez BLIK i kontynuuj korzystanie z funkcji Pro!",
  days3: "Nie trać dostępu do Premium - odnów subskrypcję w kilka sekund!",
  days1: "Twoja subskrypcja kończy się dziś! Kliknij aby odnowić.",
  expired: "Twój dostęp Pro wygasł. Odnów aby odblokować wszystkie funkcje!",
};

// Send FCM notification
async function sendFCMPush(
  token: string,
  title: string,
  body: string,
  platform: "android" | "ios" = "android"
): Promise<{ success: boolean; error?: string }> {
  const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");
  
  if (!fcmServerKey) {
    return { success: false, error: "FCM_SERVER_KEY not configured" };
  }

  try {
    const message: Record<string, unknown> = {
      to: token,
      priority: "high",
      data: {
        url: "/settings",
        title: title,
        body: body,
        type: "subscription_reminder",
      },
      notification: {
        title: title,
        body: body,
        icon: "ic_notification",
        sound: "default",
        click_action: "OPEN_SETTINGS",
      },
    };

    if (platform === "android") {
      message.android = {
        priority: "high",
        notification: {
          channel_id: "subscription_channel",
        },
      };
    }

    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `key=${fcmServerKey}`,
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    return { success: result.success === 1 };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// Send Web Push notification
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
    return { success: false, status: response.status };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

const handler = async (req: Request): Promise<Response> => {
  logStep("Subscription reminder function started");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    logStep("Checking for expiring subscriptions", { 
      now: now.toISOString(),
      in1Day: in1Day.toISOString(),
      in3Days: in3Days.toISOString(),
      in7Days: in7Days.toISOString(),
    });

    // Find users with expiring subscriptions (BLIK-based, from database)
    const { data: expiringProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, subscription_expires_at, email')
      .eq('subscription_status', 'active')
      .not('subscription_expires_at', 'is', null);

    if (profilesError) {
      logStep("ERROR: Failed to fetch profiles", { error: profilesError.message });
      return new Response(
        JSON.stringify({ error: "Failed to fetch profiles" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Found active subscriptions", { count: expiringProfiles?.length || 0 });

    const usersToNotify: Array<{
      user_id: string;
      reminderType: 'days7' | 'days3' | 'days1' | 'expired';
      expiresAt: Date;
    }> = [];

    for (const profile of expiringProfiles || []) {
      if (!profile.subscription_expires_at) continue;
      
      const expiresAt = new Date(profile.subscription_expires_at);
      const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      // Determine which reminder to send
      if (daysUntilExpiry <= 0) {
        usersToNotify.push({ user_id: profile.user_id, reminderType: 'expired', expiresAt });
        
        // Also update status to expired
        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'expired' })
          .eq('user_id', profile.user_id);
          
      } else if (daysUntilExpiry === 1) {
        usersToNotify.push({ user_id: profile.user_id, reminderType: 'days1', expiresAt });
      } else if (daysUntilExpiry === 3) {
        usersToNotify.push({ user_id: profile.user_id, reminderType: 'days3', expiresAt });
      } else if (daysUntilExpiry === 7) {
        usersToNotify.push({ user_id: profile.user_id, reminderType: 'days7', expiresAt });
      }
    }

    logStep("Users to notify", { count: usersToNotify.length });

    if (usersToNotify.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No reminders to send today" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get push subscriptions for these users
    const userIds = usersToNotify.map(u => u.user_id);
    
    const { data: pushSubs, error: pushError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)
      .eq('is_active', true);

    if (pushError) {
      logStep("ERROR: Failed to fetch push subscriptions", { error: pushError.message });
    }

    logStep("Found push subscriptions", { count: pushSubs?.length || 0 });

    let successCount = 0;
    let failCount = 0;

    for (const user of usersToNotify) {
      const title = reminderTitles[user.reminderType];
      const body = reminderMessages[user.reminderType];
      
      // Find push subscription for this user
      const userSubs = (pushSubs || []).filter(s => s.user_id === user.user_id);
      
      for (const sub of userSubs) {
        const platform = (sub.platform || "web") as "web" | "android" | "ios";
        
        let result: { success: boolean };
        
        if (platform === "android" || platform === "ios") {
          result = await sendFCMPush(sub.endpoint, title, body, platform);
        } else if (vapidPublicKey) {
          const payload = JSON.stringify({
            title,
            body,
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            tag: "subscription-reminder",
            data: { url: "/settings" },
          });
          result = await sendWebPush(sub as unknown as DecryptedSubscription, payload, vapidPublicKey);
        } else {
          result = { success: false };
        }

        if (result.success) {
          successCount++;
          logStep("Reminder sent", { userId: user.user_id, type: user.reminderType, platform });
        } else {
          failCount++;
          logStep("Failed to send reminder", { userId: user.user_id, type: user.reminderType, platform });
        }
      }
    }

    logStep("Completed subscription reminders", { sent: successCount, failed: failCount });

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
