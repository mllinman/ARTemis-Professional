/**
 * ARTemis Professional - Service Worker (V3.1)
 * 
 * Provides offline functionality and caching for PWA features.
 * Caches the complete app shell for true offline support.
 */

const CACHE_VERSION = 'artemis-v3.1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const DYNAMIC_CACHE_MAX_ITEMS = 100;

// Complete app shell — all files needed for offline functionality
const STATIC_FILES = [
    './src/index.html',
    './src/login.html',
    './src/splash.html',
    './src/styles.css',
    './src/renderer.js',
    './src/main.js',
    './src/preload.js',
    './src/auth.js',
    './src/advanced-colorwheel.css',
    './src/advanced-colorwheel.js',
    './src/node-editor.css',
    './src/node-editor.js',
    './src/panel-system.css',
    './src/panel-manager.js',
    './src/vector-tools.js',
    './src/ai-tools.js',
    './src/color-management.js',
    './src/photo-editing-tools.js',
    './src/workflow-automation.js',
    './src/accessibility.js',
    './src/animation.js',
    './src/animation-ui.js',
    './src/canvas-rotation.js',
    './src/cloud-sync.js',
    './src/cloud-sync-ui.js',
    './src/export-manager.js',
    './src/learning-help.js',
    './src/memory-manager.js',
    './src/performance-manager.js',
    './src/pdf-exporter.js',
    './src/print-settings.js',
    './src/professional-blend-modes.js',
    './src/professional-tools-extended.js',
    './src/progressive-loader.js',
    './src/psd-exporter.js',
    './src/reference-canvas.js',
    './src/session-recorder.js',
    './src/slicing-tool.js',
    './src/subscription-ui.js',
    './src/tiff-exporter.js',
    './src/tiled-canvas.js',
    './src/ui-customization.js',
    './src/webgl-renderer.js',
    './src/advanced-brush-engines.js',
    './manifest.json',
];

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing v3.1...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[Service Worker] Caching app shell (' + STATIC_FILES.length + ' files)');
                // Use addAll but don't fail the install if some files are missing
                return Promise.allSettled(
                    STATIC_FILES.map(url => 
                        cache.add(url).catch(err => {
                            console.warn(`[Service Worker] Failed to cache: ${url}`, err.message);
                        })
                    )
                );
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
    console.log('[Service Worker] Activating v3.1...');
    
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
    
    // Skip cross-origin requests (except Google Sign-In and Stripe)
    if (!request.url.startsWith(self.location.origin)) {
        return;
    }
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
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
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.error('[Service Worker] Fetch failed:', error);
        // Return offline fallback for navigation requests
        if (request.mode === 'navigate') {
            return offlineFallback();
        }
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
        if (response.ok) {
            cache.put(request, response.clone());
        }
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
    
    const fetchPromise = fetch(request).then(async (response) => {
        if (response.ok) {
            cache.put(request, response.clone());
            // Evict old entries if cache gets too large
            await trimCache(DYNAMIC_CACHE, DYNAMIC_CACHE_MAX_ITEMS);
        }
        return response;
    }).catch(() => cached);
    
    return cached || fetchPromise;
}

/**
 * Trim cache to a maximum number of entries
 */
async function trimCache(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
        // Delete oldest entries (FIFO)
        const deleteCount = keys.length - maxItems;
        for (let i = 0; i < deleteCount; i++) {
            await cache.delete(keys[i]);
        }
    }
}

/**
 * Generate offline fallback page
 */
function offlineFallback() {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ARTemis — Offline</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1e1e1e; color: #ccc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; }
        .container { text-align: center; max-width: 480px; }
        h1 { font-size: 2rem; color: #0e639c; margin-bottom: 1rem; }
        p { font-size: 1.1rem; line-height: 1.6; margin-bottom: 1.5rem; opacity: 0.8; }
        button { background: #0e639c; color: #fff; border: none; padding: 12px 32px; font-size: 1rem; border-radius: 6px; cursor: pointer; transition: background 0.2s; }
        button:hover { background: #1177bb; }
        .icon { font-size: 4rem; margin-bottom: 1rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🎨</div>
        <h1>You're Offline</h1>
        <p>ARTemis needs an internet connection to load for the first time. Once loaded, it works fully offline.</p>
        <button onclick="location.reload()">Try Again</button>
    </div>
</body>
</html>`;
    return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
    });
}

/**
 * Check if URL is a static file
 */
function isStaticFile(url) {
    return STATIC_FILES.some(file => url.includes(file.replace('./', ''))) ||
           url.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/);
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
    
    if (event.data && event.data.type === 'GET_CACHE_SIZE') {
        // Report cache status back to client
        caches.keys().then(async (names) => {
            const sizes = {};
            for (const name of names) {
                const cache = await caches.open(name);
                const keys = await cache.keys();
                sizes[name] = keys.length;
            }
            event.source.postMessage({ type: 'CACHE_SIZE', data: sizes });
        });
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

console.log('[Service Worker] Loaded v3.1');
