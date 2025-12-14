import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SETUP-VAULT-KEY] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting vault key setup");
    
    const encryptionKey = Deno.env.get("PUSH_ENCRYPTION_KEY");
    if (!encryptionKey) {
      logStep("No PUSH_ENCRYPTION_KEY found in environment");
      return new Response(
        JSON.stringify({ success: false, error: "PUSH_ENCRYPTION_KEY not configured in Edge Function secrets" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header to identify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      logStep("Auth error", { error: authError?.message });
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is super admin (user #1)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_number")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile || profile.user_number !== 1) {
      logStep("Unauthorized - not super admin", { userNumber: profile?.user_number });
      return new Response(
        JSON.stringify({ error: "Only super admin can setup vault key" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Super admin authenticated", { userId: user.id });

    // Check if key already exists in vault
    const { data: existingKey } = await supabase.rpc('check_vault_key_exists');
    
    if (existingKey === true) {
      logStep("Key already exists in vault");
      return new Response(
        JSON.stringify({ success: true, message: "Key already configured in Vault" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert key into vault using raw SQL via service role
    // We need to use a database function for this
    const { error: insertError } = await supabase.rpc('setup_encryption_key_in_vault', {
      p_key_value: encryptionKey
    });

    if (insertError) {
      logStep("Error inserting key into vault", { error: insertError.message });
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Key successfully added to vault");
    
    // Log admin activity
    await supabase.rpc('log_admin_activity', {
      p_admin_user_id: user.id,
      p_action_type: 'VAULT_KEY_SETUP',
      p_details: { action: 'encryption_key_configured' }
    });

    return new Response(
      JSON.stringify({ success: true, message: "Encryption key configured in Vault" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("Error", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
