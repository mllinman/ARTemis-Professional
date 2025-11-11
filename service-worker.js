/**
 * ARTemis Professional - Service Worker (V3)
 * 
 * Provides offline functionality and caching for PWA features
 */

const CACHE_VERSION = 'artemis-v3-cache-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Files to cache immediately
const STATIC_FILES = [
    '/src/index.html',
    '/src/login.html',
    '/src/styles.css',
    '/src/main.js',
    '/src/advanced-colorwheel.css',
    '/src/advanced-colorwheel.js',
    '/src/node-editor.css',
    '/src/panel-system.css',
    '/manifest.json',
];

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[Service Worker] Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .catch((error) => {
                console.error('[Service Worker] Cache failed:', error);
            })
    );
    
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((cacheName) => {
                        return cacheName.startsWith('artemis-') && 
                               cacheName !== STATIC_CACHE && 
                               cacheName !== DYNAMIC_CACHE;
                    })
                    .map((cacheName) => {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    })
            );
        })
    );
    
    // Take control of all pages immediately
    return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    
    // Skip cross-origin requests
    if (!request.url.startsWith(self.location.origin)) {
        return;
    }
    
    // Use cache-first strategy for static files
    if (isStaticFile(request.url)) {
        event.respondWith(cacheFirst(request));
    }
    // Use network-first strategy for API calls
    else if (isApiRequest(request.url)) {
        event.respondWith(networkFirst(request));
    }
    // Use stale-while-revalidate for everything else
    else {
        event.respondWith(staleWhileRevalidate(request));
    }
});

/**
 * Cache-first strategy
 */
async function cacheFirst(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    
    if (cached) {
        return cached;
    }
    
    try {
        const response = await fetch(request);
        cache.put(request, response.clone());
        return response;
    } catch (error) {
        console.error('[Service Worker] Fetch failed:', error);
        return new Response('Offline - content not available', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

/**
 * Network-first strategy (for API calls)
 */
async function networkFirst(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    
    try {
        const response = await fetch(request);
        cache.put(request, response.clone());
        return response;
    } catch (error) {
        const cached = await cache.match(request);
        if (cached) {
            return cached;
        }
        
        return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Stale-while-revalidate strategy
 */
async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cached = await cache.match(request);
    
    const fetchPromise = fetch(request).then((response) => {
        cache.put(request, response.clone());
        return response;
    });
    
    return cached || fetchPromise;
}

/**
 * Check if URL is a static file
 */
function isStaticFile(url) {
    return STATIC_FILES.some(file => url.includes(file)) ||
           url.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/);
}

/**
 * Check if URL is an API request
 */
function isApiRequest(url) {
    return url.includes('/api/') || url.includes('api.artemis.app');
}

// Handle messages from clients
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            })
        );
    }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-canvas') {
        event.waitUntil(syncCanvas());
    }
});

/**
 * Sync canvas changes when back online
 */
async function syncCanvas() {
    console.log('[Service Worker] Syncing canvas changes...');
    // In production, sync pending changes with cloud
    return Promise.resolve();
}

console.log('[Service Worker] Loaded');
