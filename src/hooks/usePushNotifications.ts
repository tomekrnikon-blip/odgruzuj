import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, ActionPerformed } from '@capacitor/push-notifications';

// Ten hook został zaktualizowany, aby korzystać z bezpiecznych funkcji RPC
// do zapisu i szyfrowania danych subskrypcji w bazie danych.

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<string>('default');
  const [vapidKey, setVapidKey] = useState<string>('');

  const isNative = Capacitor.isNativePlatform();
  const isIOS = Capacitor.getPlatform() === 'ios' || /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                (window.navigator as any).standalone === true;

  useEffect(() => {
    if (isNative) {
      setIsSupported(true);
      PushNotifications.checkPermissions().then(perm => setPermission(perm.receive));
    } else {
      const webSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      setIsSupported(webSupported);
      if (webSupported) {
        setPermission(Notification.permission);
        supabase.functions.invoke('get-vapid-key').then(({ data, error }) => {
          if (!error && data?.publicKey) setVapidKey(data.publicKey);
        });
      }
    }
  }, [isNative]);

  useEffect(() => {
    if (!user || !isSupported) return;
    const checkSubscription = async () => {
      const { data, error } = await supabase.rpc('check_push_subscription_status', { p_user_id: user.id });
      if (!error && data && data.length > 0) {
        setIsSubscribed(data[0].has_subscription && data[0].is_active);
      } else {
        setIsSubscribed(false);
      }
    };
    checkSubscription();
  }, [user, isSupported]);

  const subscribe = useCallback(async (notificationTime?: string) => {
    if (!user || !isSupported) return false;
    setIsLoading(true);

    try {
      if (isNative) {
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') permStatus = await PushNotifications.requestPermissions();
        if (permStatus.receive !== 'granted') {
          toast.error('Musisz zezwolić na powiadomienia w ustawieniach aplikacji');
          return false;
        }
        await PushNotifications.register();
        return true;
      } else {
        const permissionResult = await Notification.requestPermission();
        setPermission(permissionResult);
        if (permissionResult !== 'granted') {
          toast.error('Musisz zezwolić na powiadomienia w przeglądarce');
          return false;
        }
        if (!vapidKey) {
          toast.error('Klucz VAPID nie jest skonfigurowany');
          return false;
        }

        const registration = await navigator.serviceWorker.getRegistration();
        await navigator.serviceWorker.ready;
        const applicationServerKey = urlBase64ToUint8Array(vapidKey) as BufferSource;
        const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
        const subJson = subscription.toJSON();

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
      console.error('Error subscribing to push:', error);
      toast.error('Nie udało się włączyć powiadomień');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported, isNative, vapidKey]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;
    setIsLoading(true);
    try {
      if (!isNative) {
         const registration = await navigator.serviceWorker.getRegistration();
         const subscription = await registration?.pushManager.getSubscription();
         await subscription?.unsubscribe();
      }
      // Use secure RPC function instead of direct table access
      const { error } = await supabase.rpc('delete_user_push_subscription');
      if (error) throw error;
      setIsSubscribed(false);
      toast.success('Powiadomienia push wyłączone');
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Nie udało się wyłączyć powiadomień');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isNative]);

  useEffect(() => {
    if (!isNative || !user) return;

    PushNotifications.removeAllListeners().then(() => {
        PushNotifications.addListener('registration', async (token: Token) => {
            const { error } = await supabase.rpc('save_and_encrypt_subscription', {
              p_platform: Capacitor.getPlatform(),
              p_endpoint: token.value,
              p_p256dh_plaintext: 'N/A',
              p_auth_plaintext: 'N/A',
              p_notification_time: '09:00:00',
            });

            if (error) {
                toast.error(`Błąd zapisu tokena: ${error.message}`);
            } else {
                setIsSubscribed(true);
                toast.success('Powiadomienia push włączone!');
            }
        });

        PushNotifications.addListener('registrationError', (err: any) => {
            toast.error(`Błąd rejestracji powiadomień: ${err.error}`);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push received: ', notification);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
            console.log('Push action performed: ', action);
        });
    });

    return () => {
        PushNotifications.removeAllListeners();
    };
  }, [isNative, user]);

  const updateNotificationTime = useCallback(async (time: string) => {
    if (!user) return false;
    // Use secure RPC function instead of direct table access
    const { error } = await supabase.rpc('update_notification_time', { p_time: time });
    if (error) {
        toast.error("Błąd aktualizacji godziny");
        return false;
    }
    toast.success('Godzina powiadomień zaktualizowana');
    return true;
  }, [user]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    isIOS,
    isPWA,
    subscribe,
    unsubscribe,
    updateNotificationTime,
  };
}
