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

    // 2. Pobranie użytkowników przez RPC (deszyfruje i maskuje emaile)
    const { data: profiles, error: usersError } = await supabaseAdmin
      .rpc('get_admin_profiles');

    if (usersError) {
      throw usersError;
    }

    // 3. Pobranie ról dla wszystkich użytkowników
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      throw rolesError;
    }

    // 4. Mapowanie ról do użytkowników
    const rolesMap = new Map<string, string>();
    roles?.forEach((r: { user_id: string; role: string }) => {
      const current = rolesMap.get(r.user_id);
      if (!current || r.role === 'admin' || (r.role === 'moderator' && current !== 'admin')) {
        rolesMap.set(r.user_id, r.role);
      }
    });

    // 5. Łączenie danych
    const users = profiles?.map((p: { id: string; user_id: string; email: string; display_name: string | null; user_number: number; subscription_status: string; subscription_expires_at: string | null }) => ({
      id: p.user_id,
      email: p.email,
      display_name: p.display_name,
      user_number: p.user_number,
      role: rolesMap.get(p.user_id) || 'user',
      subscription_status: p.subscription_status,
      subscription_expires_at: p.subscription_expires_at,
    }));

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
