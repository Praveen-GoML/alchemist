/* Alchemist service worker: shows push notifications on the device, even when the app is closed. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = { body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'Alchemist';
  const origin = self.location.origin;
  // if Alchemist is open in a tab, let it play its own sound too
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => ws.forEach(w => w.postMessage({ type: 'chime' }))));
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      // absolute URLs + version so the phone always fetches the current artwork
      icon: origin + '/icon-192.png?v=3',
      badge: origin + '/badge-72.png?v=3',
      tag: data.tag || 'alchemist',
      renotify: true,
      timestamp: Date.now(),
      vibrate: [120, 60, 120],
      // timesheet reminders get two buttons: Finished (dismiss) and Open (Lattice)
      actions: data.kind === 'reminder'
        ? [{ action: 'finished', title: 'Finished' }, { action: 'open', title: 'Open' }]
        : [{ action: 'open', title: 'Open' }],
      data: { link: data.link || '' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '';
  if (event.action === 'finished') return; // done: just dismiss
  if (/^https?:\/\//i.test(link)) { event.waitUntil(self.clients.openWindow(link)); return; } // external page, e.g. Lattice
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
