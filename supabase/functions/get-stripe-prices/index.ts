import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default display prices (fallback)
const DEFAULT_PRICES = {
  monthly_price_display: "9,90 zł",
  yearly_price_display: "49,90 zł",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabaseAdmin
      .from('stripe_config')
      .select('key, value')
      .in('key', ['monthly_price_display', 'yearly_price_display']);

    if (error) {
      console.error('[GET-STRIPE-PRICES] Database error:', error);
      return new Response(JSON.stringify({
        monthlyPrice: DEFAULT_PRICES.monthly_price_display,
        yearlyPrice: DEFAULT_PRICES.yearly_price_display,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const priceMap: Record<string, string> = {};
    data?.forEach(item => {
      priceMap[item.key] = item.value;
    });

    return new Response(JSON.stringify({
      monthlyPrice: priceMap['monthly_price_display'] || DEFAULT_PRICES.monthly_price_display,
      yearlyPrice: priceMap['yearly_price_display'] || DEFAULT_PRICES.yearly_price_display,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('[GET-STRIPE-PRICES] Error:', error);
    return new Response(JSON.stringify({
      monthlyPrice: DEFAULT_PRICES.monthly_price_display,
      yearlyPrice: DEFAULT_PRICES.yearly_price_display,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
