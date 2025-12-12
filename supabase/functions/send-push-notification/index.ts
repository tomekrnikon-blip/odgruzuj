import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7';

// Ta funkcja serwerowa została zaktualizowana, aby obsługiwać
// bazę danych z zaszyfrowanymi kolumnami.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { user_id, title, body, data: additionalData } = await req.json();

    if (!user_id) {
      throw new Error('user_id is required');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_KEY')!
    );

    // Wywołujemy funkcję RPC, która bezpiecznie odszyfruje dane na serwerze
    const { data: subscriptions, error } = await supabaseAdmin.rpc('get_decrypted_subscriptions', { p_user_id: user_id });

    if (error) throw new Error(`Error fetching subscriptions: ${error.message}`);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'No active subscriptions found.' }), { status: 200 });
    }

    const payload = JSON.stringify({ title: title || 'Nowe powiadomienie', body: body || 'Masz nową wiadomość!', data: additionalData || {} });

    for (const sub of subscriptions) {
      if (sub.platform === 'web' && sub.p256dh && sub.auth) {
        // Logika dla Web Push
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };
        // Logika wysyłania web-push... (pozostaje taka sama jak w poprzedniej wersji)
      } else if (sub.platform === 'android') {
        // Logika dla Androida (FCM)... (pozostaje taka sama jak w poprzedniej wersji)
      }
      // ... reszta platform
    }

    return new Response(JSON.stringify({ message: `Sent ${subscriptions.length} notifications.` }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    return new Response(String(err?.message ?? err), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
