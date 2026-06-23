// PopSongChordBook Service Worker
// Cache-first for app shell; network-first for dynamic content

const CACHE_NAME = 'popsongchordbook-shell-v1';
const SHELL_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './images/pwa_icon_192.png',
    './images/pwa_icon_512.png'
];

// ── Install: pre-cache the app shell ──────────────────────────────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(SHELL_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// ── Activate: delete outdated caches ─────────────────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// ── Fetch: cache-first for shell, network-first for everything else ───────────
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET and cross-origin requests (e.g. Firebase, YouTube)
    if (request.method !== 'GET' || url.origin !== location.origin) {
        return;
    }

    // Cache-first for static shell assets
    const isShellAsset = SHELL_ASSETS.some(asset =>
        url.pathname === new URL(asset, location.origin).pathname
    );

    if (isShellAsset) {
        event.respondWith(
            caches.match(request).then(cached => cached || fetch(request))
        );
        return;
    }

    // Network-first for everything else (pages, song data, etc.)
    event.respondWith(
        fetch(request)
            .catch(() => caches.match(request))
    );
});
