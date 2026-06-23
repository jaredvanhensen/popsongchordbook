// PopSongChordBook Service Worker
// Network-first strategy — always fetches fresh content, falls back to cache offline

const CACHE_NAME = 'popsongchordbook-shell-v2';

// ── Install: skip waiting so the new SW activates immediately ─────────────────
self.addEventListener('install', event => {
    self.skipWaiting();
});

// ── Activate: delete ALL old caches and claim clients immediately ─────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.map(key => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

// ── Fetch: network-first for everything ───────────────────────────────────────
// Always try the network. Only fall back to cache when offline.
// This ensures deployed updates are never blocked by stale cached files.
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle GET requests from our own origin
    if (request.method !== 'GET' || url.origin !== location.origin) {
        return;
    }

    event.respondWith(
        fetch(request)
            .then(response => {
                // Cache a copy of successful responses for offline fallback
                if (response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                }
                return response;
            })
            .catch(() => caches.match(request))
    );
});
