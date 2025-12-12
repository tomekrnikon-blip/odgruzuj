import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({ timestamp, step, ...details }));
};

// Decrypt using old key with pgcrypto via RPC
async function decryptWithOldKey(
  supabase: any,
  encryptedValue: string,
  oldKey: string
): Promise<string | null> {
  try {
    // Check if value looks encrypted (base64 pgp data starts with 'wy4')
    if (!encryptedValue || !encryptedValue.startsWith('wy4')) {
      return encryptedValue; // Not encrypted, return as-is
    }

    const { data, error } = await supabase.rpc('decrypt_with_custom_key', {
      encrypted_text: encryptedValue,
      encryption_key: oldKey
    });

    if (error) {
      logStep('Decryption error', { error: error.message });
      return null;
    }
    return data;
  } catch (e) {
    logStep('Decryption exception', { error: String(e) });
    return null;
  }
}

// Encrypt using new key with pgcrypto via RPC
async function encryptWithNewKey(
  supabase: any,
  plainValue: string,
  newKey: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('encrypt_with_custom_key', {
      plain_text: plainValue,
      encryption_key: newKey
    });

    if (error) {
      logStep('Encryption error', { error: error.message });
      return null;
    }
    return data;
  } catch (e) {
    logStep('Encryption exception', { error: String(e) });
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is admin
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get request body
    const { oldKey, newKey } = await req.json();
    
    if (!oldKey || !newKey) {
      return new Response(JSON.stringify({ 
        error: 'Both oldKey and newKey are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (oldKey === newKey) {
      return new Response(JSON.stringify({ 
        error: 'New key must be different from old key' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    logStep('Starting key rotation', { adminUserId: user.id });

    const results = {
      profiles: { processed: 0, success: 0, failed: 0 },
      push_subscriptions: { processed: 0, success: 0, failed: 0 }
    };

    // Re-encrypt profile emails
    logStep('Processing profiles emails');
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .not('email', 'is', null);

    if (profilesError) {
      logStep('Error fetching profiles', { error: profilesError.message });
    } else if (profiles) {
      for (const profile of profiles) {
        results.profiles.processed++;
        
        if (!profile.email?.startsWith('wy4')) {
          // Not encrypted, skip
          continue;
        }

        const decrypted = await decryptWithOldKey(supabaseAdmin, profile.email, oldKey);
        if (!decrypted) {
          results.profiles.failed++;
          logStep('Failed to decrypt profile email', { profileId: profile.id });
          continue;
        }

        const encrypted = await encryptWithNewKey(supabaseAdmin, decrypted, newKey);
        if (!encrypted) {
          results.profiles.failed++;
          logStep('Failed to encrypt profile email', { profileId: profile.id });
          continue;
        }

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ email: encrypted })
          .eq('id', profile.id);

        if (updateError) {
          results.profiles.failed++;
          logStep('Failed to update profile', { profileId: profile.id, error: updateError.message });
        } else {
          results.profiles.success++;
        }
      }
    }

    // Re-encrypt push subscriptions
    logStep('Processing push subscriptions');
    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, auth, p256dh');

    if (subsError) {
      logStep('Error fetching subscriptions', { error: subsError.message });
    } else if (subscriptions) {
      for (const sub of subscriptions) {
        results.push_subscriptions.processed++;
        
        let newAuth = sub.auth;
        let newP256dh = sub.p256dh;
        let hasChanges = false;

        // Re-encrypt auth if encrypted
        if (sub.auth?.startsWith('wy4')) {
          const decryptedAuth = await decryptWithOldKey(supabaseAdmin, sub.auth, oldKey);
          if (decryptedAuth) {
            const encryptedAuth = await encryptWithNewKey(supabaseAdmin, decryptedAuth, newKey);
            if (encryptedAuth) {
              newAuth = encryptedAuth;
              hasChanges = true;
            }
          }
        }

        // Re-encrypt p256dh if encrypted
        if (sub.p256dh?.startsWith('wy4')) {
          const decryptedP256dh = await decryptWithOldKey(supabaseAdmin, sub.p256dh, oldKey);
          if (decryptedP256dh) {
            const encryptedP256dh = await encryptWithNewKey(supabaseAdmin, decryptedP256dh, newKey);
            if (encryptedP256dh) {
              newP256dh = encryptedP256dh;
              hasChanges = true;
            }
          }
        }

        if (hasChanges) {
          const { error: updateError } = await supabaseAdmin
            .from('push_subscriptions')
            .update({ auth: newAuth, p256dh: newP256dh })
            .eq('id', sub.id);

          if (updateError) {
            results.push_subscriptions.failed++;
            logStep('Failed to update subscription', { subId: sub.id, error: updateError.message });
          } else {
            results.push_subscriptions.success++;
          }
        }
      }
    }

    // Log admin activity
    await supabaseAdmin.rpc('log_admin_activity', {
      p_admin_user_id: user.id,
      p_action_type: 'encryption_key_rotation',
      p_target_table: 'multiple',
      p_details: results
    });

    logStep('Key rotation completed', results);

    return new Response(JSON.stringify({
      success: true,
      message: 'Key rotation completed. Remember to update PUSH_ENCRYPTION_KEY in Supabase secrets!',
      results,
      nextSteps: [
        '1. Verify the re-encryption was successful by checking the results above',
        '2. Update the PUSH_ENCRYPTION_KEY secret in Supabase Vault with the new key',
        '3. Test that notifications and email decryption still work'
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logStep('Error in key rotation', { error: String(error) });
    return new Response(JSON.stringify({ 
      error: 'Key rotation failed', 
      details: String(error) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});