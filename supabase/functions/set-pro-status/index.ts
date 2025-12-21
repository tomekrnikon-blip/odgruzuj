import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[SET-PRO-STATUS] Function called');
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser();
    console.log('[SET-PRO-STATUS] User check:', { userId: user?.id, error: userError?.message });
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Brak autoryzacji' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Sprawdź rolę w tabeli user_roles
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    console.log('[SET-PRO-STATUS] Admin check:', { adminRole, error: roleError?.message });

    if (roleError || !adminRole) {
      return new Response(JSON.stringify({ error: 'Brak uprawnień administratora' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { userId, expiresAt } = await req.json();

    if (!userId) {
        return new Response(JSON.stringify({ error: 'Brak ID użytkownika' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const subscription_status = expiresAt ? 'active' : 'free';

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ subscription_status, subscription_expires_at: expiresAt })
      .eq('user_id', userId);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ message: 'Status Pro zaktualizowany pomyślnie' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Nieznany błąd';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
