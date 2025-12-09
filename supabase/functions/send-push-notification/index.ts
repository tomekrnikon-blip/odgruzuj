import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[SEND-PUSH] Function started");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("[SEND-PUSH] VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, title, body, sendToAll } = await req.json();

    console.log("[SEND-PUSH] Request:", { userId, title, body, sendToAll });

    let query = supabase
      .from("push_subscriptions")
      .select("*")
      .eq("is_active", true);

    if (!sendToAll && userId) {
      query = query.eq("user_id", userId);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error("[SEND-PUSH] Error fetching subscriptions:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[SEND-PUSH] Found ${subscriptions?.length || 0} subscriptions`);

    const payload = JSON.stringify({
      title: title || "odgruzuj.pl",
      body: body || "Czas na porządki! 🧹",
      icon: "/favicon.jpg",
      data: { url: "/" },
    });

    let successCount = 0;
    let failCount = 0;

    for (const sub of (subscriptions as PushSubscription[]) || []) {
      try {
        // Simple push notification via endpoint
        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "TTL": "86400",
          },
          body: payload,
        });

        if (response.ok || response.status === 201) {
          successCount++;
          console.log(`[SEND-PUSH] Sent to ${sub.endpoint}`);
        } else {
          console.error(`[SEND-PUSH] Failed for ${sub.endpoint}: ${response.status}`);
          failCount++;
          
          // Mark failed subscription as inactive if 404 or 410
          if (response.status === 404 || response.status === 410) {
            await supabase
              .from("push_subscriptions")
              .update({ is_active: false })
              .eq("id", sub.id);
          }
        }
      } catch (err) {
        console.error(`[SEND-PUSH] Error for ${sub.endpoint}:`, err);
        failCount++;
      }
    }

    console.log(`[SEND-PUSH] Sent: ${successCount}, Failed: ${failCount}`);

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: failCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[SEND-PUSH] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
