// Service Worker for Push Notifications
// Compatible with iOS Safari PWA and Android/Chrome

self.addEventListener('push', function(event) {
  console.log('[SW] Push received:', event);
  
  let data = {
    title: 'odgruzuj.pl',
    body: 'Czas na porządki! 🧹',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      console.log('[SW] Could not parse push data:', e);
      try {
        data.body = event.data.text();
      } catch (textError) {
        console.log('[SW] Could not get text data:', textError);
      }
    }
  }

  // iOS requires simpler notification options
  const isIOS = /iPhone|iPad|iPod/.test(self.navigator?.userAgent || '');
  
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || 'odgruzuj-notification',
    renotify: data.renotify !== undefined ? data.renotify : true,
    requireInteraction: !isIOS && (data.requireInteraction !== undefined ? data.requireInteraction : true),
    data: data.data || { url: '/' },
    silent: false, // Ensure notification plays system sound
  };

  // Only add vibrate and actions for non-iOS (iOS doesn't support these)
  if (!isIOS) {
    // Alarm-like vibration pattern: long-short-long-short-long
    options.vibrate = [500, 200, 500, 200, 500, 200, 300, 100, 300];
    options.actions = [
      { action: 'open', title: '🧹 Porządkuję!' },
      { action: 'dismiss', title: '⏰ Później' }
    ];
  }

  // iOS Safari PWA requires the notification to be shown immediately
  // within the waitUntil promise
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('[SW] Notification closed:', event);
});

// Handle service worker install
self.addEventListener('install', function(event) {
  console.log('[SW] Push service worker installed');
  self.skipWaiting();
});

// Handle service worker activate
self.addEventListener('activate', function(event) {
  console.log('[SW] Push service worker activated');
  event.waitUntil(clients.claim());
});
