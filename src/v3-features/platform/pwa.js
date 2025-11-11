/**
 * ARTemis Professional - Progressive Web App Support (V3)
 * 
 * Enables PWA features including offline support, installation, and app-like experience
 * 
 * @module v3-features/platform/pwa
 */

class PWAManager {
    constructor() {
        this.initialized = false;
        this.deferredPrompt = null;
        this.isInstalled = false;
    }

    /**
     * Initialize PWA features
     */
    async initialize(capabilities) {
        if (this.initialized) return;

        console.log('📱 Initializing PWA features...');

        // Check if service workers are supported
        if (!capabilities.serviceWorker) {
            console.warn('Service Workers not supported - PWA features limited');
            return;
        }

        // Register service worker
        await this.registerServiceWorker();

        // Set up install prompt
        this.setupInstallPrompt();

        // Check if already installed
        this.checkInstallStatus();

        // Set up offline detection
        this.setupOfflineDetection();

        this.initialized = true;
        console.log('✅ PWA features initialized');
    }

    /**
     * Register the service worker
     */
    async registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log('✅ Service Worker registered:', registration.scope);

            // Check for updates periodically
            setInterval(() => {
                registration.update();
            }, 60000); // Check every minute

        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    /**
     * Set up install prompt capture
     */
    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            console.log('📥 Install prompt available');

            // Show custom install button
            this.showInstallButton();
        });

        // Detect when app is installed
        window.addEventListener('appinstalled', () => {
            console.log('✅ App installed');
            this.isInstalled = true;
            this.hideInstallButton();
        });
    }

    /**
     * Check if app is already installed
     */
    checkInstallStatus() {
        // Check if running in standalone mode
        if (window.matchMedia('(display-mode: standalone)').matches) {
            this.isInstalled = true;
            console.log('✅ Running as installed PWA');
        }
    }

    /**
     * Prompt user to install the app
     */
    async promptInstall() {
        if (!this.deferredPrompt) {
            console.log('Install prompt not available');
            return false;
        }

        // Show the install prompt
        this.deferredPrompt.prompt();

        // Wait for the user's response
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log(`Install prompt outcome: ${outcome}`);

        // Clear the deferred prompt
        this.deferredPrompt = null;

        return outcome === 'accepted';
    }

    /**
     * Show install button in UI
     */
    showInstallButton() {
        const menuBar = document.getElementById('menu-bar');
        if (!menuBar || document.getElementById('pwa-install-btn')) return;

        const installBtn = document.createElement('button');
        installBtn.id = 'pwa-install-btn';
        installBtn.className = 'menu-btn';
        installBtn.innerHTML = '📥 Install App';
        installBtn.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 10000; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;';
        
        installBtn.addEventListener('click', () => {
            this.promptInstall();
        });

        document.body.appendChild(installBtn);
    }

    /**
     * Hide install button
     */
    hideInstallButton() {
        const btn = document.getElementById('pwa-install-btn');
        if (btn) {
            btn.remove();
        }
    }

    /**
     * Set up offline/online detection
     */
    setupOfflineDetection() {
        window.addEventListener('online', () => {
            console.log('🌐 Back online');
            this.showNotification('Connection restored', 'success');
        });

        window.addEventListener('offline', () => {
            console.log('📴 Offline');
            this.showNotification('Working offline - changes will sync when online', 'warning');
        });
    }

    /**
     * Show a notification
     */
    showNotification(message, type = 'info') {
        console.log(`[${type}] ${message}`);
        // In production, use proper notification system
    }

    /**
     * Check if app can be installed
     */
    canInstall() {
        return this.deferredPrompt !== null;
    }

    /**
     * Get PWA status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            installed: this.isInstalled,
            canInstall: this.canInstall(),
            online: navigator.onLine,
        };
    }
}

const pwaManager = new PWAManager();

export async function initialize(capabilities) {
    return pwaManager.initialize(capabilities);
}

export { pwaManager };
