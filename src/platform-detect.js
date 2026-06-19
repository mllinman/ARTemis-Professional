/**
 * ARTemis Professional — Platform Detection
 * 
 * Detects device capabilities and auto-configures quality settings.
 * Provides a unified API for feature detection across browsers.
 */

class PlatformDetector {
    constructor() {
        this.capabilities = this._detect();
        this._logCapabilities();
    }

    _detect() {
        return {
            // Input
            hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            hasPen: this._detectPen(),
            hasPointerEvents: 'PointerEvent' in window,
            hasPressure: this._detectPressure(),

            // GPU / Rendering
            hasWebGPU: 'gpu' in navigator,
            hasWebGL2: this._detectWebGL(2),
            hasWebGL: this._detectWebGL(1),
            hasOffscreenCanvas: 'OffscreenCanvas' in window,
            maxTextureSize: this._getMaxTextureSize(),

            // Storage
            hasIndexedDB: 'indexedDB' in window,
            hasFileSystemAccess: 'showSaveFilePicker' in window,
            hasStorageManager: 'storage' in navigator && 'estimate' in navigator.storage,

            // Performance
            cpuCores: navigator.hardwareConcurrency || 1,
            deviceMemoryGB: navigator.deviceMemory || null, // May be unavailable
            hasWebWorkers: 'Worker' in window,
            hasSharedArrayBuffer: 'SharedArrayBuffer' in window,

            // APIs
            hasEyeDropper: 'EyeDropper' in window,
            hasClipboard: 'clipboard' in navigator,
            hasVibration: 'vibrate' in navigator,
            hasWakeLock: 'wakeLock' in navigator,
            hasServiceWorker: 'serviceWorker' in navigator,
            hasCryptoSubtle: !!(window.crypto && window.crypto.subtle),

            // Platform
            isElectron: !!(window.electronAPI && window.electronAPI.isElectron),
            isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
            isTablet: this._detectTablet(),
            platform: navigator.platform || 'unknown',
            browser: this._detectBrowser(),
            colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
            prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        };
    }

    _detectPen() {
        // Check if any pointer with type 'pen' is available
        if (window.matchMedia) {
            return window.matchMedia('(any-pointer: fine)').matches;
        }
        return false;
    }

    _detectPressure() {
        // PointerEvent.pressure is always available with PointerEvents
        // but real pressure sensitivity requires hardware
        return 'PointerEvent' in window;
    }

    _detectWebGL(version) {
        try {
            const canvas = document.createElement('canvas');
            const contextName = version === 2 ? 'webgl2' : 'webgl';
            const ctx = canvas.getContext(contextName);
            return !!ctx;
        } catch (e) {
            return false;
        }
    }

    _getMaxTextureSize() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (gl) {
                return gl.getParameter(gl.MAX_TEXTURE_SIZE);
            }
        } catch (e) {
            // Fallback
        }
        return 4096; // Conservative default
    }

    _detectTablet() {
        const ua = navigator.userAgent;
        return /iPad/i.test(ua) || 
               (/Android/i.test(ua) && !/Mobile/i.test(ua)) ||
               (navigator.maxTouchPoints > 0 && screen.width >= 768);
    }

    _detectBrowser() {
        const ua = navigator.userAgent;
        if (ua.includes('Edg/')) return 'edge';
        if (ua.includes('Chrome/')) return 'chrome';
        if (ua.includes('Firefox/')) return 'firefox';
        if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'safari';
        return 'unknown';
    }

    _logCapabilities() {
        const c = this.capabilities;
        console.log('[Platform]', c.browser, 'on', c.platform);
        console.log('[Platform] GPU:', 
            c.hasWebGPU ? 'WebGPU' : c.hasWebGL2 ? 'WebGL2' : c.hasWebGL ? 'WebGL' : 'CPU only');
        console.log('[Platform] Cores:', c.cpuCores, 
            c.deviceMemoryGB ? `Memory: ${c.deviceMemoryGB}GB` : '');
        console.log('[Platform] Max texture:', c.maxTextureSize + 'px');
        console.log('[Platform] Input:', 
            [c.hasTouch && 'Touch', c.hasPen && 'Pen', c.hasPressure && 'Pressure']
            .filter(Boolean).join(', ') || 'Mouse only');
    }

    /**
     * Get recommended quality settings based on device capabilities
     */
    getRecommendedSettings() {
        const c = this.capabilities;
        
        // High-end device
        if (c.cpuCores >= 8 && (c.deviceMemoryGB === null || c.deviceMemoryGB >= 8) && c.hasWebGL2) {
            return {
                quality: 'high',
                maxCanvasSize: Math.min(c.maxTextureSize, 16384),
                maxUndoStates: 80,
                enableWebGL: true,
                enableWebGPU: c.hasWebGPU,
                enableWorkers: c.hasWebWorkers,
                brushPreviewQuality: 'high',
                thumbnailSize: 120,
            };
        }
        
        // Mid-range device
        if (c.cpuCores >= 4 && c.hasWebGL) {
            return {
                quality: 'medium',
                maxCanvasSize: Math.min(c.maxTextureSize, 8192),
                maxUndoStates: 40,
                enableWebGL: true,
                enableWebGPU: false,
                enableWorkers: c.hasWebWorkers,
                brushPreviewQuality: 'medium',
                thumbnailSize: 80,
            };
        }
        
        // Low-end device
        return {
            quality: 'low',
            maxCanvasSize: 4096,
            maxUndoStates: 20,
            enableWebGL: false,
            enableWebGPU: false,
            enableWorkers: false,
            brushPreviewQuality: 'low',
            thumbnailSize: 60,
        };
    }

    /**
     * Check if a specific feature is supported
     */
    supports(feature) {
        return !!this.capabilities[feature];
    }

    /**
     * Get estimated available storage
     */
    async getStorageEstimate() {
        if (this.capabilities.hasStorageManager) {
            try {
                const estimate = await navigator.storage.estimate();
                return {
                    usage: estimate.usage,
                    quota: estimate.quota,
                    availableMB: Math.round((estimate.quota - estimate.usage) / (1024 * 1024)),
                };
            } catch (e) {
                return null;
            }
        }
        return null;
    }
}

// Create global instance
const platform = new PlatformDetector();
window.platform = platform;
