const CACHE_NAME = 'maro-tracker-v3';
const URLS_TO_CACHE = [
    '/',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    console.log('SW: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('SW: Caching core assets');
                return cache.addAll(URLS_TO_CACHE);
            })
            .catch((error) => console.error('SW: Cache addAll failed:', error))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // API requests: Network only (or Network first)
    if (event.request.url.includes('/api/') || event.request.url.includes('supabase')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Static assets and navigation: Cache first, fall back to network
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});
