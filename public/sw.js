/* Alchemist service worker: shows push notifications on the device, even when the app is closed. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = { body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'Alchemist';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: data.tag || 'alchemist',
      renotify: true,
      data: { link: data.link || '' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '';
  const hash = link ? (link.startsWith('#') ? link : '#' + link.replace(/^\/+/, '')) : '';
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // an Alchemist window is already open: focus it and tell it where to go
    for (const w of wins) {
      if ('focus' in w) {
        await w.focus();
        w.postMessage({ type: 'navigate', hash });
        return;
      }
    }
    await self.clients.openWindow('/' + hash);
  })());
});
