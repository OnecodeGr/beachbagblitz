// Deliberately does nothing beyond existing — no caching, no fetch interception.
// Its only job is to be *present*, since some browsers still use "a service worker is
// registered" as one of their installability signals. The game leans on always-fresh
// /api/* data (leaderboard, daily challenge, stats), so caching responses here would
// risk serving stale scores/state — not worth it for a summer microsite.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
