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

    // Sprawdź rolę w tabeli user_roles (nie profiles)
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !adminRole) {
      return new Response(JSON.stringify({ error: 'Brak uprawnień administratora' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Pobranie wszystkich użytkowników z ich rolami
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, email, display_name, user_number, subscription_status, subscription_expires_at')
      .order('user_number', { ascending: true });

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
