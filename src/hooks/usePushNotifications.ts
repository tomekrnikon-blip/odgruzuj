import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

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

// Get VAPID public key from environment or use placeholder
const getVapidPublicKey = (): string => {
  // This will be replaced with actual key from secrets
  // For now, we'll fetch it dynamically or use a default
  return import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
};

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [vapidKey, setVapidKey] = useState<string>('');

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }

    // Fetch VAPID public key from edge function
    const fetchVapidKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-vapid-key');
        if (!error && data?.publicKey) {
          setVapidKey(data.publicKey);
        }
      } catch (err) {
        console.error('Error fetching VAPID key:', err);
      }
    };

    fetchVapidKey();
  }, []);

  useEffect(() => {
    if (!user || !isSupported) return;

    // Check if user is already subscribed
    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    };

    checkSubscription();
  }, [user, isSupported]);

  const subscribe = useCallback(async (notificationTime?: string) => {
    if (!user || !isSupported) return false;

    setIsLoading(true);
    try {
      // Request notification permission
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

      // Register service worker for push
      let registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw-push.js');
        await navigator.serviceWorker.ready;
      }

      // Convert VAPID key
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      const subscriptionJson = subscription.toJSON();
      
      if (!subscriptionJson.endpoint || !subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
        throw new Error('Invalid subscription data');
      }

      // Save subscription to database
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subscriptionJson.endpoint,
        p256dh: subscriptionJson.keys.p256dh,
        auth: subscriptionJson.keys.auth,
        notification_time: notificationTime || '09:00:00',
        is_active: true,
      }, {
        onConflict: 'user_id,endpoint',
      });

      if (error) {
        console.error('Error saving subscription:', error);
        toast.error('Nie udało się zapisać subskrypcji');
        return false;
      }

      setIsSubscribed(true);
      toast.success('Powiadomienia push włączone!');
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Nie udało się włączyć powiadomień');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported, vapidKey]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          
          // Remove from database
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('endpoint', subscription.endpoint);
        }
      }

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
  }, [user]);

  const updateNotificationTime = useCallback(async (time: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ notification_time: time })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating notification time:', error);
        return false;
      }

      toast.success('Godzina powiadomień zaktualizowana');
      return true;
    } catch (error) {
      console.error('Error updating notification time:', error);
      return false;
    }
  }, [user]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    updateNotificationTime,
  };
}
