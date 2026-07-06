// Service worker for the admin PWA. Deliberately does NOT cache API
// responses or navigations — this dashboard shows live leads, WhatsApp
// queue state, and Market Pulse data, so serving anything stale would be
// actively wrong. It exists only to (a) satisfy the browser's
// installability requirement of a controlling service worker with a fetch
// handler, and (b) receive and display web push notifications.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Pure passthrough — every request goes straight to the network, nothing
// is cached or intercepted.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener('push', (event) => {
  let data = { title: 'Levitate Admin', body: 'You have a new notification.', url: '/admin/dashboard' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* fall back to defaults above */
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/admin/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/admin/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus();
      }
      for (const client of clients) {
        if ('navigate' in client && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
