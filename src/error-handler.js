/**
 * ARTemis Professional — Error Handler & Auto-Save
 * 
 * Global error boundary with crash recovery.
 * Auto-saves canvas state to IndexedDB for disaster recovery.
 */

class ErrorHandler {
    constructor() {
        this._errorCount = 0;
        this._maxErrors = 10; // Max errors before suggesting reload
        this._setupGlobalHandlers();
    }

    _setupGlobalHandlers() {
        // Catch synchronous errors
        window.onerror = (message, source, lineno, colno, error) => {
            this._handleError({
                type: 'uncaught',
                message,
                source: source ? source.split('/').pop() : 'unknown',
                line: lineno,
                col: colno,
                stack: error?.stack,
            });
            return true; // Prevent default browser error handling
        };

        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this._handleError({
                type: 'promise',
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack,
            });
            event.preventDefault();
        });

        console.log('[ErrorHandler] Global error handlers registered');
    }

    _handleError(errorInfo) {
        this._errorCount++;

        // Log to console
        console.error('[ARTemis Error]', errorInfo.type, errorInfo.message);
        if (errorInfo.stack) {
            console.error('[Stack]', errorInfo.stack);
        }

        // Show user-friendly notification (if toast system is available)
        if (window.toast) {
            if (this._errorCount <= 3) {
                window.toast.warning(
                    errorInfo.message || 'An unexpected error occurred',
                    'Something went wrong'
                );
            }
        }

        // If too many errors, suggest reload
        if (this._errorCount >= this._maxErrors) {
            if (window.toast) {
                window.toast.error(
                    'Multiple errors detected. Your work has been auto-saved. Try reloading the page.',
                    'Stability Issue'
                );
            }
            this._errorCount = 0; // Reset to avoid spamming
        }
    }

    /**
     * Reset the error counter (e.g., after successful operations)
     */
    reset() {
        this._errorCount = 0;
    }
}


class AutoSave {
    constructor() {
        this.dbName = 'artemis-autosave';
        this.dbVersion = 1;
        this.storeName = 'canvasStates';
        this.intervalMs = 60000; // Auto-save every 60 seconds
        this.maxSnapshots = 5;   // Keep last 5 auto-saves
        this._db = null;
        this._timer = null;
        this._dirty = false;     // Whether canvas has been modified
    }

    /**
     * Initialize the auto-save system
     */
    async init() {
        try {
            this._db = await this._openDB();
            this._startTimer();
            this._trackChanges();
            console.log('[AutoSave] Initialized — saving every', this.intervalMs / 1000, 'seconds');
        } catch (error) {
            console.warn('[AutoSave] Failed to initialize IndexedDB:', error.message);
        }
    }

    _openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    _startTimer() {
        if (this._timer) clearInterval(this._timer);
        this._timer = setInterval(() => {
            if (this._dirty) {
                this.save();
            }
        }, this.intervalMs);
    }

    _trackChanges() {
        // Mark canvas as dirty on any drawing interaction
        const events = ['pointerdown', 'pointerup'];
        const canvas = document.getElementById('draw-canvas') || document.getElementById('main-canvas');
        if (canvas) {
            events.forEach(evt => {
                canvas.addEventListener(evt, () => {
                    this._dirty = true;
                }, { passive: true });
            });
        }
    }

    /**
     * Save current canvas state to IndexedDB
     */
    async save() {
        if (!this._db) return;

        try {
            // Collect all layer data
            const canvasData = this._captureState();
            if (!canvasData) return;

            const snapshot = {
                id: 'autosave-' + Date.now(),
                timestamp: Date.now(),
                data: canvasData,
                version: '2.0.0',
            };

            const tx = this._db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            store.put(snapshot);

            // Clean up old snapshots
            await this._pruneOldSnapshots(store);

            this._dirty = false;

            if (window.toast) {
                // Don't show toast for auto-saves to avoid interrupting work
                console.log('[AutoSave] Saved at', new Date().toLocaleTimeString());
            }
        } catch (error) {
            console.warn('[AutoSave] Save failed:', error.message);
        }
    }

    _captureState() {
        // Capture the main canvas as a data URL
        const mainCanvas = document.getElementById('main-canvas');
        if (!mainCanvas) return null;

        try {
            return {
                mainCanvas: mainCanvas.toDataURL('image/png'),
                canvasWidth: mainCanvas.width,
                canvasHeight: mainCanvas.height,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            console.warn('[AutoSave] Canvas capture failed:', error.message);
            return null;
        }
    }

    async _pruneOldSnapshots(store) {
        return new Promise((resolve) => {
            const index = store.index('timestamp');
            const request = index.openCursor(null, 'prev');
            let count = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    count++;
                    if (count > this.maxSnapshots) {
                        cursor.delete();
                    }
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            request.onerror = () => resolve();
        });
    }

    /**
     * Check if there's a recoverable auto-save
     * @returns {Object|null} The latest auto-save or null
     */
    async getLatestSave() {
        if (!this._db) return null;

        return new Promise((resolve) => {
            const tx = this._db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const index = store.index('timestamp');
            const request = index.openCursor(null, 'prev');

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                resolve(cursor ? cursor.value : null);
            };
            request.onerror = () => resolve(null);
        });
    }

    /**
     * Offer recovery on app load
     */
    async checkForRecovery() {
        const save = await this.getLatestSave();
        if (!save) return;

        const age = Date.now() - save.timestamp;
        const ageMinutes = Math.round(age / 60000);

        // Only offer recovery for saves less than 24 hours old
        if (age > 24 * 60 * 60 * 1000) return;

        if (window.toast) {
            const toastEl = window.toast.show(
                `Auto-save found from ${ageMinutes} minutes ago. Click to recover.`,
                {
                    type: 'info',
                    title: 'Recovery Available',
                    duration: 15000,
                    onClick: () => {
                        this._recoverFromSave(save);
                    }
                }
            );
        }
    }

    async _recoverFromSave(save) {
        if (!save?.data?.mainCanvas) return;

        try {
            const mainCanvas = document.getElementById('main-canvas');
            if (!mainCanvas) return;

            const ctx = mainCanvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                mainCanvas.width = save.data.canvasWidth || img.width;
                mainCanvas.height = save.data.canvasHeight || img.height;
                ctx.drawImage(img, 0, 0);
                if (window.toast) {
                    window.toast.success('Canvas recovered successfully!', 'Recovery Complete');
                }
            };
            img.src = save.data.mainCanvas;
        } catch (error) {
            if (window.toast) {
                window.toast.error('Failed to recover auto-save: ' + error.message);
            }
        }
    }

    /**
     * Stop the auto-save timer
     */
    destroy() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
        }
    }
}

// Create global instances
const errorHandler = new ErrorHandler();
const autoSave = new AutoSave();

// Initialize auto-save when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        autoSave.init().then(() => autoSave.checkForRecovery());
    });
} else {
    autoSave.init().then(() => autoSave.checkForRecovery());
}

window.errorHandler = errorHandler;
window.autoSave = autoSave;
