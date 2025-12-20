import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Zmień na swój URL w produkcji
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 1. Weryfikacja, czy użytkownik jest adminem
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Brak autoryzacji' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Brak uprawnień administratora' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Pobranie wszystkich użytkowników, jeśli weryfikacja przebiegła pomyślnie
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, avatar_url, role, subscription_status, subscription_expires_at')
      .order('email', { ascending: true });

    if (usersError) {
      throw usersError;
    }

    return new Response(JSON.stringify(users), {
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
