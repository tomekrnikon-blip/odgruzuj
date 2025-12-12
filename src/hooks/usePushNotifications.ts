import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';

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

type Platform = 'web' | 'android' | 'ios';

// Detect current platform
function detectPlatform(): Platform {
  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform();
    if (platform === 'android') return 'android';
    if (platform === 'ios') return 'ios';
  }
  return 'web';
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [vapidKey, setVapidKey] = useState<string>('');
  const [isIOS, setIsIOS] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [platform, setPlatform] = useState<Platform>('web');

  useEffect(() => {
    const detectedPlatform = detectPlatform();
    setPlatform(detectedPlatform);
    
    // Detect iOS (both native and browser)
    const iOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || detectedPlatform === 'ios';
    setIsIOS(iOS);
    
    // Detect if running as PWA (standalone mode) - only for web
    const standalone = detectedPlatform === 'web' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
    setIsPWA(standalone);

    // Check if push notifications are supported
    let supported = false;
    
    if (Capacitor.isNativePlatform()) {
      // Native apps support push via Capacitor
      supported = true;
    } else {
      // Web/PWA support
      supported = 'serviceWorker' in navigator 
        && 'PushManager' in window 
        && 'Notification' in window
        && (!iOS || standalone); // iOS Safari only works in PWA mode
    }
    
    setIsSupported(supported);

    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Fetch VAPID public key from edge function (for web push)
    if (detectedPlatform === 'web') {
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
    }

    // Setup native push notification listeners
    if (Capacitor.isNativePlatform()) {
      setupNativeListeners();
    }
  }, []);

  // Setup listeners for native push notifications
  const setupNativeListeners = async () => {
    // Listen for registration success
    await PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Push registration success, token:', token.value.substring(0, 20) + '...');
      // Token will be saved when subscribe is called
    });

    // Listen for registration errors
    await PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
    });

    // Listen for push notifications received while app is in foreground
    await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received:', notification);
      // Show local notification or handle in-app
      toast(notification.title || 'Powiadomienie', {
        description: notification.body,
      });
    });

    // Listen for push notification actions (user tapped notification)
    await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('Push notification action performed:', action);
      // Navigate to appropriate page based on notification data
      const url = action.notification.data?.url;
      if (url && typeof url === 'string') {
        window.location.href = url;
      }
    });
  };

  useEffect(() => {
    if (!user || !isSupported) return;

    // Check if user is already subscribed
    const checkSubscription = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          // For native, check if we have a subscription in DB
          const { data } = await supabase.rpc('check_push_subscription_status', {
            p_user_id: user.id
          });
          if (data && data.length > 0) {
            setIsSubscribed(data[0].has_subscription && data[0].is_active);
          }
        } else {
          // For web, check service worker subscription
          const registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
          if (registration) {
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
          }
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    };

    checkSubscription();
  }, [user, isSupported]);

  // Subscribe to native push notifications (Android/iOS)
  const subscribeNative = useCallback(async (notificationTime?: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Request permission
      const permResult = await PushNotifications.requestPermissions();
      
      if (permResult.receive !== 'granted') {
        toast.error('Musisz zezwolić na powiadomienia');
        return false;
      }

      // Register for push notifications
      await PushNotifications.register();

      // Wait for the registration token
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          toast.error('Timeout podczas rejestracji powiadomień');
          resolve(false);
        }, 10000);

        PushNotifications.addListener('registration', async (token: Token) => {
          clearTimeout(timeout);
          
          try {
            // Save FCM token to database
            const { error } = await supabase.from('push_subscriptions').upsert({
              user_id: user.id,
              endpoint: token.value, // FCM token stored in endpoint field
              p256dh: 'native', // Placeholder for native
              auth: 'native', // Placeholder for native
              platform: platform,
              notification_time: notificationTime || '09:00:00',
              is_active: true,
            }, {
              onConflict: 'user_id,endpoint',
            });

            if (error) {
              console.error('Error saving native subscription:', error);
              toast.error('Nie udało się zapisać subskrypcji');
              resolve(false);
              return;
            }

            setIsSubscribed(true);
            toast.success('Powiadomienia push włączone!');
            resolve(true);
          } catch (err) {
            console.error('Error in registration handler:', err);
            resolve(false);
          }
        });
      });
    } catch (error) {
      console.error('Error subscribing to native push:', error);
      toast.error('Nie udało się włączyć powiadomień');
      return false;
    }
  }, [user, platform]);

  // Subscribe to web push notifications
  const subscribeWeb = useCallback(async (notificationTime?: string): Promise<boolean> => {
    if (!user) return false;

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
        platform: 'web',
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
    }
  }, [user, vapidKey]);

  // Main subscribe function - chooses appropriate method based on platform
  const subscribe = useCallback(async (notificationTime?: string): Promise<boolean> => {
    if (!user || !isSupported) return false;

    setIsLoading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        return await subscribeNative(notificationTime);
      } else {
        return await subscribeWeb(notificationTime);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported, subscribeNative, subscribeWeb]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    setIsLoading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        // Unregister from native push
        await PushNotifications.removeAllListeners();
        
        // Remove from database (all subscriptions for this user on this platform)
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('platform', platform);
      } else {
        // Unsubscribe from web push
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
  }, [user, platform]);

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
    isIOS,
    isPWA,
    platform,
    subscribe,
    unsubscribe,
    updateNotificationTime,
  };
}
