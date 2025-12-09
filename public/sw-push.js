// Service Worker for Push Notifications
self.addEventListener('push', function(event) {
  console.log('[SW] Push received:', event);
  
  let data = {
    title: 'odgruzuj.pl',
    body: 'Czas na porządki! 🧹',
    icon: '/favicon.jpg',
    badge: '/favicon.jpg',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      console.log('[SW] Could not parse push data:', e);
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.jpg',
    badge: data.badge || '/favicon.jpg',
    vibrate: [200, 100, 200],
    tag: 'odgruzuj-notification',
    renotify: true,
    requireInteraction: true,
    data: data.data || { url: '/' },
    actions: [
      { action: 'open', title: 'Otwórz aplikację' },
      { action: 'dismiss', title: 'Odrzuć' }
    ]
  };

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
