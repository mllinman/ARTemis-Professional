/**
 * ARTemis Cloud Sync UI
 * Phase 14 Implementation - UI components for cloud sync system
 */

class CloudSyncUI {
    constructor(cloudSync) {
        this.cloudSync = cloudSync;
        this.panel = null;
        this.isVisible = false;
    }

    /**
     * Create the cloud sync panel UI
     */
    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'cloud-sync-panel';
        panel.className = 'panel cloud-sync-panel';
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            right: 20px;
            transform: translateY(-50%);
            background: var(--bg-secondary, #2a2a2a);
            border: 1px solid var(--border-color, #3a3a3a);
            border-radius: 8px;
            padding: 16px;
            width: 320px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            display: none;
        `;

        panel.innerHTML = `
            <div class="cloud-sync-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                <h3 style="margin: 0; font-size: 16px; color: var(--text-primary, #fff);">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
                        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                    </svg>
                    Cloud Sync
                </h3>
                <button id="close-cloud-panel" style="background: none; border: none; color: var(--text-secondary, #ccc); cursor: pointer; font-size: 18px;">&times;</button>
            </div>

            <div class="cloud-sync-status" style="margin-bottom: 16px; padding: 12px; background: var(--bg-primary, #1a1a1a); border-radius: 4px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <div id="sync-status-indicator" style="width: 10px; height: 10px; border-radius: 50%; background: #888;"></div>
                    <span id="sync-status-text" style="font-size: 13px; color: var(--text-secondary, #ccc);">Not synced</span>
                </div>
                <div id="sync-stats" style="font-size: 11px; color: var(--text-tertiary, #888); line-height: 1.6;">
                    <div>Projects: <span id="stat-projects">0</span></div>
                    <div>Brushes: <span id="stat-brushes">0</span></div>
                    <div>Workspaces: <span id="stat-workspaces">0</span></div>
                    <div>Storage: <span id="stat-storage">-</span></div>
                </div>
            </div>

            <div class="cloud-sync-controls" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
                <button id="sync-enable-auto" class="cloud-btn" title="Enable Auto-Sync">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                    </svg>
                    <span id="auto-sync-text">Enable Auto-Sync</span>
                </button>
                <button id="sync-now" class="cloud-btn" title="Sync Now">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                    </svg>
                    Sync Now
                </button>
            </div>

            <div class="cloud-sections">
                <!-- Projects Section -->
                <div class="cloud-section" style="margin-bottom: 16px;">
                    <h4 style="font-size: 13px; color: var(--text-primary, #fff); margin: 0 0 8px 0; display: flex; align-items: center; justify-content: space-between;">
                        <span>Projects</span>
                        <button id="refresh-projects" class="icon-btn" title="Refresh">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                            </svg>
                        </button>
                    </h4>
                    <div id="projects-list" style="max-height: 200px; overflow-y: auto; font-size: 12px;">
                        <div style="color: var(--text-tertiary, #888); padding: 8px; text-align: center;">No projects saved</div>
                    </div>
                </div>

                <!-- Backup Section -->
                <div class="cloud-section" style="margin-bottom: 16px;">
                    <h4 style="font-size: 13px; color: var(--text-primary, #fff); margin: 0 0 8px 0;">Backup & Restore</h4>
                    <div style="display: flex; gap: 8px;">
                        <button id="export-backup" class="cloud-btn secondary" style="flex: 1;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
                            </svg>
                            Export
                        </button>
                        <button id="import-backup" class="cloud-btn secondary" style="flex: 1;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6-.67l-2.59 2.58L9 12.5l5-5 5 5-1.41 1.41L13 11.33V21h-2v-9.67z"/>
                            </svg>
                            Import
                        </button>
                    </div>
                </div>

                <!-- Share Section -->
                <div class="cloud-section">
                    <h4 style="font-size: 13px; color: var(--text-primary, #fff); margin: 0 0 8px 0;">Share</h4>
                    <div style="display: flex; gap: 8px;">
                        <button id="generate-share-link" class="cloud-btn secondary" style="flex: 1;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                            </svg>
                            Generate Link
                        </button>
                    </div>
                    <div id="share-link-output" style="margin-top: 8px; display: none;">
                        <input type="text" id="share-link-input" readonly style="width: 100%; padding: 6px; background: var(--bg-primary, #1a1a1a); border: 1px solid var(--border-color, #3a3a3a); color: var(--text-primary, #fff); border-radius: 4px; font-size: 11px; font-family: monospace;">
                        <button id="copy-share-link" class="cloud-btn secondary" style="width: 100%; margin-top: 4px;">Copy Link</button>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .cloud-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                padding: 8px 12px;
                background: var(--accent, #4a9eff);
                border: 1px solid var(--accent, #4a9eff);
                border-radius: 4px;
                color: white;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
                width: 100%;
            }

            .cloud-btn:hover:not(:disabled) {
                background: var(--accent-hover, #3a8eef);
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }

            .cloud-btn:active:not(:disabled) {
                transform: scale(0.98);
            }

            .cloud-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .cloud-btn.secondary {
                background: var(--button-bg, #3a3a3a);
                border-color: var(--border-color, #4a4a4a);
                color: var(--text-primary, #fff);
            }

            .cloud-btn.secondary:hover:not(:disabled) {
                background: var(--button-hover, #4a4a4a);
                border-color: var(--accent, #4a9eff);
            }

            .icon-btn {
                background: none;
                border: none;
                color: var(--text-secondary, #ccc);
                cursor: pointer;
                padding: 4px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s;
            }

            .icon-btn:hover {
                background: var(--button-hover, #4a4a4a);
                color: var(--text-primary, #fff);
            }

            .project-item {
                padding: 8px;
                background: var(--bg-primary, #1a1a1a);
                border: 1px solid var(--border-color, #3a3a3a);
                border-radius: 4px;
                margin-bottom: 6px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .project-item:hover {
                border-color: var(--accent, #4a9eff);
                background: var(--bg-secondary, #2a2a2a);
            }

            .project-item .name {
                font-weight: 500;
                color: var(--text-primary, #fff);
                margin-bottom: 4px;
            }

            .project-item .meta {
                font-size: 10px;
                color: var(--text-tertiary, #888);
            }

            .cloud-sync-panel::-webkit-scrollbar {
                width: 8px;
            }

            .cloud-sync-panel::-webkit-scrollbar-track {
                background: var(--bg-primary, #1a1a1a);
                border-radius: 4px;
            }

            .cloud-sync-panel::-webkit-scrollbar-thumb {
                background: var(--border-color, #3a3a3a);
                border-radius: 4px;
            }

            .cloud-sync-panel::-webkit-scrollbar-thumb:hover {
                background: var(--text-tertiary, #888);
            }
        `;
        document.head.appendChild(style);

        this.panel = panel;
        document.body.appendChild(panel);

        this.attachEventListeners();
        this.updateStats();

        return panel;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        document.getElementById('close-cloud-panel')?.addEventListener('click', () => this.hide());
        document.getElementById('sync-enable-auto')?.addEventListener('click', () => this.toggleAutoSync());
        document.getElementById('sync-now')?.addEventListener('click', () => this.syncNow());
        document.getElementById('refresh-projects')?.addEventListener('click', () => this.refreshProjects());
        document.getElementById('export-backup')?.addEventListener('click', () => this.exportBackup());
        document.getElementById('import-backup')?.addEventListener('click', () => this.importBackup());
        document.getElementById('generate-share-link')?.addEventListener('click', () => this.generateShareLink());
        document.getElementById('copy-share-link')?.addEventListener('click', () => this.copyShareLink());
    }

    /**
     * Show the panel
     */
    show() {
        if (!this.panel) {
            this.createPanel();
        }
        this.panel.style.display = 'block';
        this.isVisible = true;
        this.updateStats();
        this.refreshProjects();
    }

    /**
     * Hide the panel
     */
    hide() {
        if (this.panel) {
            this.panel.style.display = 'none';
        }
        this.isVisible = false;
    }

    /**
     * Toggle panel visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Update sync statistics
     */
    async updateStats() {
        try {
            const stats = await this.cloudSync.getSyncStats();

            document.getElementById('stat-projects').textContent = stats.projectCount || 0;
            document.getElementById('stat-brushes').textContent = stats.brushCount || 0;
            document.getElementById('stat-workspaces').textContent = stats.workspaceCount || 0;

            if (stats.storageUsed) {
                const usedMB = (stats.storageUsed.usage / (1024 * 1024)).toFixed(2);
                const totalMB = (stats.storageUsed.quota / (1024 * 1024)).toFixed(2);
                document.getElementById('stat-storage').textContent = `${usedMB}MB / ${totalMB}MB`;
            }

            // Update status indicator
            const indicator = document.getElementById('sync-status-indicator');
            const statusText = document.getElementById('sync-status-text');

            if (stats.syncEnabled) {
                indicator.style.background = '#4caf50';
                statusText.textContent = 'Auto-sync enabled';
            } else if (stats.lastSyncTime) {
                indicator.style.background = '#ff9800';
                const timeSince = Math.floor((Date.now() - stats.lastSyncTime) / 1000 / 60);
                statusText.textContent = `Synced ${timeSince}m ago`;
            } else {
                indicator.style.background = '#888';
                statusText.textContent = 'Not synced';
            }
        } catch (error) {
            console.error('Failed to update stats:', error);
        }
    }

    /**
     * Toggle auto-sync
     */
    async toggleAutoSync() {
        const btn = document.getElementById('sync-enable-auto');
        const textSpan = document.getElementById('auto-sync-text');

        if (this.cloudSync.syncEnabled) {
            this.cloudSync.disableAutoSync();
            textSpan.textContent = 'Enable Auto-Sync';
            btn.classList.remove('active');
        } else {
            this.cloudSync.enableAutoSync(async () => {
                await this.syncNow();
            });
            textSpan.textContent = 'Disable Auto-Sync';
            btn.classList.add('active');
        }

        await this.updateStats();
    }

    /**
     * Sync now
     */
    async syncNow() {
        const btn = document.getElementById('sync-now');
        btn.disabled = true;
        btn.innerHTML = '<span>Syncing...</span>';

        try {
            // This would be called by the main application with actual data
            console.log('Sync triggered');
            await this.updateStats();
            await this.refreshProjects();
        } catch (error) {
            console.error('Sync failed:', error);
            alert('Sync failed: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                </svg>
                Sync Now
            `;
        }
    }

    /**
     * Refresh projects list
     */
    async refreshProjects() {
        try {
            const projects = await this.cloudSync.getAllProjects();
            const projectsList = document.getElementById('projects-list');

            if (projects.length === 0) {
                projectsList.innerHTML = '<div style="color: var(--text-tertiary, #888); padding: 8px; text-align: center;">No projects saved</div>';
            } else {
                projectsList.innerHTML = projects.map(project => {
                    const date = new Date(project.timestamp).toLocaleDateString();
                    const time = new Date(project.timestamp).toLocaleTimeString();
                    return `
                        <div class="project-item" data-project-id="${project.id}">
                            <div class="name">${project.name || 'Untitled'}</div>
                            <div class="meta">${date} ${time}</div>
                        </div>
                    `;
                }).join('');

                // Add click handlers
                projectsList.querySelectorAll('.project-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const projectId = item.dataset.projectId;
                        this.onProjectLoad?.(projectId);
                    });
                });
            }
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    }

    /**
     * Export backup
     */
    async exportBackup() {
        try {
            const data = await this.cloudSync.exportAllData();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `artemis-backup-${Date.now()}.json`;
            a.click();

            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed: ' + error.message);
        }
    }

    /**
     * Import backup
     */
    async importBackup() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const text = await file.text();
                    const success = await this.cloudSync.importAllData(text);

                    if (success) {
                        alert('Backup imported successfully!');
                        await this.updateStats();
                        await this.refreshProjects();
                    } else {
                        alert('Failed to import backup');
                    }
                } catch (error) {
                    console.error('Import failed:', error);
                    alert('Import failed: ' + error.message);
                }
            }
        };

        input.click();
    }

    /**
     * Generate share link
     */
    async generateShareLink() {
        // This would need to be called with the current project ID
        console.log('Generate share link - requires current project ID');
        alert('Share link generation requires saving the current project first.');
    }

    /**
     * Copy share link
     */
    copyShareLink() {
        const input = document.getElementById('share-link-input');
        input.select();
        document.execCommand('copy');
        alert('Link copied to clipboard!');
    }

    /**
     * Set callback for project load
     */
    onProjectLoad(callback) {
        this.onProjectLoad = callback;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CloudSyncUI;
}
