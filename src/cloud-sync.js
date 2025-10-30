/**
 * ARTemis Cloud Sync System
 * Phase 14 Implementation - Cloud sync and collaboration features
 */

class CloudSync {
    constructor() {
        this.db = null;
        this.syncEnabled = false;
        this.lastSyncTime = null;
        this.syncInterval = null;
        this.autoSyncDelay = 30000; // 30 seconds
        this.projectHistory = [];
        this.maxHistoryVersions = 10;
    }

    /**
     * Initialize IndexedDB for local storage
     */
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ARTemisCloudSync', 1);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                if (!db.objectStoreNames.contains('projects')) {
                    const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
                    projectStore.createIndex('timestamp', 'timestamp', { unique: false });
                    projectStore.createIndex('name', 'name', { unique: false });
                }

                if (!db.objectStoreNames.contains('brushes')) {
                    db.createObjectStore('brushes', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('workspaces')) {
                    db.createObjectStore('workspaces', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('history')) {
                    const historyStore = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
                    historyStore.createIndex('projectId', 'projectId', { unique: false });
                    historyStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    /**
     * Save data to IndexedDB
     */
    async saveToStore(storeName, data) {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get data from IndexedDB
     */
    async getFromStore(storeName, key) {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all data from a store
     */
    async getAllFromStore(storeName) {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete from store
     */
    async deleteFromStore(storeName, key) {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Sync settings to cloud/local storage
     */
    async syncSettings(settings) {
        await this.saveToStore('settings', {
            key: 'app-settings',
            data: settings,
            timestamp: Date.now()
        });

        // Also save to localStorage as backup
        localStorage.setItem('artemis-settings-backup', JSON.stringify(settings));
        
        this.lastSyncTime = Date.now();
        return true;
    }

    /**
     * Load settings from cloud/local storage
     */
    async loadSettings() {
        try {
            const stored = await this.getFromStore('settings', 'app-settings');
            if (stored && stored.data) {
                return stored.data;
            }

            // Fallback to localStorage
            const backup = localStorage.getItem('artemis-settings-backup');
            if (backup) {
                return JSON.parse(backup);
            }

            return null;
        } catch (error) {
            console.error('Failed to load settings:', error);
            return null;
        }
    }

    /**
     * Save project with version history
     */
    async saveProject(project) {
        const projectId = project.id || Date.now().toString();
        const timestamp = Date.now();

        // Save current version
        await this.saveToStore('projects', {
            ...project,
            id: projectId,
            timestamp: timestamp,
            lastModified: timestamp
        });

        // Add to history
        await this.addToHistory(projectId, project);

        return projectId;
    }

    /**
     * Add project version to history
     */
    async addToHistory(projectId, projectData) {
        const historyEntry = {
            projectId,
            data: projectData,
            timestamp: Date.now()
        };

        await this.saveToStore('history', historyEntry);

        // Cleanup old versions if exceeding limit
        await this.cleanupHistory(projectId);
    }

    /**
     * Cleanup old history versions
     */
    async cleanupHistory(projectId) {
        if (!this.db) await this.initDB();

        const transaction = this.db.transaction(['history'], 'readwrite');
        const store = transaction.objectStore('history');
        const index = store.index('projectId');
        const request = index.getAll(projectId);

        request.onsuccess = () => {
            const versions = request.result.sort((a, b) => b.timestamp - a.timestamp);

            // Keep only the most recent versions
            if (versions.length > this.maxHistoryVersions) {
                const toDelete = versions.slice(this.maxHistoryVersions);
                toDelete.forEach(version => {
                    store.delete(version.id);
                });
            }
        };
    }

    /**
     * Get project history
     */
    async getProjectHistory(projectId) {
        if (!this.db) await this.initDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['history'], 'readonly');
            const store = transaction.objectStore('history');
            const index = store.index('projectId');
            const request = index.getAll(projectId);

            request.onsuccess = () => {
                const versions = request.result.sort((a, b) => b.timestamp - a.timestamp);
                resolve(versions);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Load project
     */
    async loadProject(projectId) {
        return await this.getFromStore('projects', projectId);
    }

    /**
     * Get all projects
     */
    async getAllProjects() {
        const projects = await this.getAllFromStore('projects');
        return projects.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Delete project
     */
    async deleteProject(projectId) {
        await this.deleteFromStore('projects', projectId);

        // Delete all history versions
        if (!this.db) await this.initDB();

        const transaction = this.db.transaction(['history'], 'readwrite');
        const store = transaction.objectStore('history');
        const index = store.index('projectId');
        const request = index.getAll(projectId);

        request.onsuccess = () => {
            const versions = request.result;
            versions.forEach(version => {
                store.delete(version.id);
            });
        };
    }

    /**
     * Sync brushes to cloud/local storage
     */
    async syncBrushes(brushes) {
        for (const brush of brushes) {
            await this.saveToStore('brushes', {
                ...brush,
                id: brush.id || brush.name,
                syncTime: Date.now()
            });
        }

        return true;
    }

    /**
     * Load brushes from cloud/local storage
     */
    async loadBrushes() {
        return await this.getAllFromStore('brushes');
    }

    /**
     * Sync workspace
     */
    async syncWorkspace(workspace) {
        await this.saveToStore('workspaces', {
            ...workspace,
            id: workspace.id || workspace.name,
            syncTime: Date.now()
        });

        return true;
    }

    /**
     * Load workspace
     */
    async loadWorkspace(workspaceId) {
        return await this.getFromStore('workspaces', workspaceId);
    }

    /**
     * Get all workspaces
     */
    async getAllWorkspaces() {
        return await this.getAllFromStore('workspaces');
    }

    /**
     * Enable auto-sync
     */
    enableAutoSync(syncCallback) {
        if (this.syncInterval) return;

        this.syncEnabled = true;
        this.syncInterval = setInterval(() => {
            if (syncCallback) {
                syncCallback().catch(error => {
                    console.error('Auto-sync failed:', error);
                });
            }
        }, this.autoSyncDelay);
    }

    /**
     * Disable auto-sync
     */
    disableAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        this.syncEnabled = false;
    }

    /**
     * Generate shareable link for project
     */
    async generateShareLink(projectId) {
        const project = await this.loadProject(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        // Encode project data to base64
        const projectJSON = JSON.stringify({
            name: project.name,
            data: project.data,
            timestamp: Date.now()
        });

        const encoded = btoa(encodeURIComponent(projectJSON));
        const shareId = Date.now().toString(36) + Math.random().toString(36).substr(2);

        // Store share data
        await this.saveToStore('projects', {
            id: `share-${shareId}`,
            sharedFrom: projectId,
            data: encoded,
            timestamp: Date.now(),
            isShared: true
        });

        // Generate URL
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?share=${shareId}`;
    }

    /**
     * Load project from share link
     */
    async loadFromShareLink(shareId) {
        const shared = await this.getFromStore('projects', `share-${shareId}`);
        if (!shared || !shared.data) {
            throw new Error('Shared project not found');
        }

        try {
            const decoded = decodeURIComponent(atob(shared.data));
            return JSON.parse(decoded);
        } catch (error) {
            throw new Error('Invalid share data');
        }
    }

    /**
     * Export all data for backup
     */
    async exportAllData() {
        const data = {
            version: '1.0',
            timestamp: Date.now(),
            settings: await this.getAllFromStore('settings'),
            projects: await this.getAllFromStore('projects'),
            brushes: await this.getAllFromStore('brushes'),
            workspaces: await this.getAllFromStore('workspaces')
        };

        return JSON.stringify(data);
    }

    /**
     * Import data from backup
     */
    async importAllData(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

            // Import settings
            for (const item of data.settings || []) {
                await this.saveToStore('settings', item);
            }

            // Import projects
            for (const item of data.projects || []) {
                await this.saveToStore('projects', item);
            }

            // Import brushes
            for (const item of data.brushes || []) {
                await this.saveToStore('brushes', item);
            }

            // Import workspaces
            for (const item of data.workspaces || []) {
                await this.saveToStore('workspaces', item);
            }

            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }

    /**
     * Get sync statistics
     */
    async getSyncStats() {
        const projects = await this.getAllProjects();
        const brushes = await this.loadBrushes();
        const workspaces = await this.getAllWorkspaces();

        return {
            lastSyncTime: this.lastSyncTime,
            syncEnabled: this.syncEnabled,
            projectCount: projects.length,
            brushCount: brushes.length,
            workspaceCount: workspaces.length,
            storageUsed: await this.estimateStorageUsage()
        };
    }

    /**
     * Estimate storage usage
     */
    async estimateStorageUsage() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return {
                usage: estimate.usage,
                quota: estimate.quota,
                percentUsed: ((estimate.usage / estimate.quota) * 100).toFixed(2)
            };
        }
        return null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CloudSync;
}
