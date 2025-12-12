import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token } from '@capacitor/push-notifications';

// Ten hook został zaktualizowany, aby korzystać z bezpiecznych funkcji RPC
// do zapisu i szyfrowania danych subskrypcji w bazie danych.

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // ... (ta funkcja pozostaje bez zmian)
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  // ... (reszta stanów bez zmian)

  const isNative = Capacitor.isNativePlatform();

  // ... (useEffect do sprawdzania wsparcia bez zmian)

  const subscribe = useCallback(async (notificationTime?: string) => {
    if (!user) return false;
    // ... (logika proszenia o pozwolenie bez zmian)

    try {
      if (isNative) {
        // NATIVE PUSH: Rejestracja tokena jest obsługiwana przez listener
        // Wystarczy poprosić o pozwolenie i zarejestrować urządzenie.
        await PushNotifications.register();
        return true;
      } else {
        // WEB PUSH: Zapisujemy subskrypcję używając nowej funkcji RPC
        const registration = await navigator.serviceWorker.register('/sw-push.js');
        // ... (reszta logiki subskrypcji web push)
        const subJson = subscription.toJSON();

        // ZMIANA: Zamiast upsert, wywołujemy bezpieczną funkcję RPC
        const { error } = await supabase.rpc('save_and_encrypt_subscription', {
          p_platform: 'web',
          p_endpoint: subJson.endpoint!,
          p_p256dh_plaintext: subJson.keys!.p256dh!,
          p_auth_plaintext: subJson.keys!.auth!,
          p_notification_time: notificationTime || '09:00:00',
        });

        if (error) throw error;
        setIsSubscribed(true);
        toast.success('Powiadomienia push włączone!');
        return true;
      }
    } catch (error) {
      // ... (obsługa błędów bez zmian)
    }
  }, [user, isNative, vapidKey]);

  // Aktualizacja listenera dla powiadomień natywnych
  useEffect(() => {
    if (!isNative || !user) return;

    PushNotifications.addListener('registration', async (token: Token) => {
      // ZMIANA: Natywny token jest zapisywany przez tę samą funkcję RPC,
      // ale przekazujemy puste wartości dla p256dh i auth, bo nie są one używane.
      const { error } = await supabase.rpc('save_and_encrypt_subscription', {
        p_platform: Capacitor.getPlatform(),
        p_endpoint: token.value,
        p_p256dh_plaintext: 'N/A', // Nie dotyczy platform natywnych
        p_auth_plaintext: 'N/A',   // Nie dotyczy platform natywnych
        p_notification_time: '09:00:00', // Domyślna wartość
      });

      if (error) {
        toast.error(`Błąd zapisu tokena: ${error.message}`);
      } else {
        setIsSubscribed(true);
        toast.success('Powiadomienia push włączone!');
      }
    });

    // ... (reszta listenerów bez zmian)
  }, [isNative, user]);

  // ... (reszta hooka bez większych zmian)

  return { /* ... */ };
}
