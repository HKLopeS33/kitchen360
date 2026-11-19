/* Recebe as notificações push (Web Push) e mostra no aparelho,
   mesmo com o app fechado. Carregado pelo service worker do PWA. */

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: event.data && event.data.text() }; }
  const title = data.title || 'Floresta Já';
  const urgent = data.type === 'new_order';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || undefined,
    renotify: !!data.tag,
    requireInteraction: urgent,          // pedido novo fica na tela até tocar
    vibrate: urgent ? [300, 120, 300, 120, 300] : [150],
    data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Reaproveita uma janela do app já aberta.
    for (const c of all) {
      if (new URL(c.url).origin === self.location.origin) {
        await c.focus();
        if ('navigate' in c) { try { await c.navigate(url); } catch { /* ignora */ } }
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
