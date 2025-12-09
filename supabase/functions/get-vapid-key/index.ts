import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("[GET-VAPID-KEY] Function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    if (!vapidPublicKey) {
      console.error("[GET-VAPID-KEY] VAPID public key not configured");
      return new Response(
        JSON.stringify({ error: "VAPID public key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[GET-VAPID-KEY] Returning public key");
    return new Response(
      JSON.stringify({ publicKey: vapidPublicKey }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[GET-VAPID-KEY] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
