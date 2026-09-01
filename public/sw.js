// Minimal service worker — required for PWA installability.
// No caching strategy here: the app is self-hosted and online-only.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
