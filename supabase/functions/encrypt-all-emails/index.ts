import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ENCRYPT-ALL-EMAILS] ${step}${detailsStr}`);
};

// Simple encryption using Web Crypto API
async function encryptEmail(email: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email);
  
  // Create a key from the secret
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  
  // Generate IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    data
  );
  
  // Combine IV + encrypted data and encode as base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  // Add prefix to identify encrypted emails
  return "enc_" + btoa(String.fromCharCode(...combined));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting batch email encryption");
    
    const encryptionKey = Deno.env.get("PUSH_ENCRYPTION_KEY");
    if (!encryptionKey) {
      logStep("No encryption key configured");
      return new Response(
        JSON.stringify({ success: false, error: "Encryption not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      logStep("Access denied - not admin");
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Admin verified, fetching unencrypted profiles");

    // Get all profiles with unencrypted emails
    const { data: profiles, error: fetchError } = await supabase
      .from("profiles")
      .select("id, user_id, email")
      .not("email", "like", "enc_%")
      .not("email", "like", "wy4%");

    if (fetchError) {
      logStep("Fetch error", { error: fetchError.message });
      return new Response(
        JSON.stringify({ error: "Failed to fetch profiles" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Found unencrypted profiles", { count: profiles?.length || 0 });

    let encrypted = 0;
    let failed = 0;

    for (const profile of profiles || []) {
      try {
        const encryptedEmail = await encryptEmail(profile.email, encryptionKey);
        
        // Use raw SQL update to bypass trigger that might cause issues
        const { error: updateError } = await supabase.rpc('update_profile_email_encrypted', {
          p_profile_id: profile.id,
          p_encrypted_email: encryptedEmail
        });

        if (updateError) {
          logStep("Failed to update profile", { id: profile.id, error: updateError.message });
          failed++;
        } else {
          encrypted++;
        }
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : "Unknown error";
        logStep("Encryption error for profile", { id: profile.id, error: errMessage });
        failed++;
      }
    }

    logStep("Batch encryption complete", { encrypted, failed });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        encrypted, 
        failed,
        total: profiles?.length || 0
      }),
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
