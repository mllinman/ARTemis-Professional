/**
 * ARTemis Professional - UI Customization Module
 * Category 15: UI/UX & Accessibility
 * Implements custom UI layouts, themes, and workspace personalization
 */

class UICustomization {
    constructor() {
        this.layouts = new Map();
        this.currentLayout = 'default';
        this.defaultLayout = null;
        this.panelStates = new Map();
        this.compactMode = false;
        this.touchMode = false;
        this.customToolbars = new Map();
        this.draggedPanel = null;
        this.dockZones = [];
        
        this.init();
    }
    
    init() {
        this.loadLayouts();
        this.initDragAndDock();
        this.initCompactMode();
        this.initTouchMode();
        this.initCustomToolbars();
        this.detectTouchDevice();
    }
    
    /**
     * Custom UI Layouts - Save and restore panel arrangements
     */
    loadLayouts() {
        const saved = localStorage.getItem('artemis-ui-layouts');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.layouts = new Map(Object.entries(data));
            } catch (e) {
                console.error('Error loading UI layouts:', e);
            }
        }
        
        // Create default layout
        this.captureDefaultLayout();
        
        // Load current layout preference
        const currentLayout = localStorage.getItem('artemis-current-layout');
        if (currentLayout && this.layouts.has(currentLayout)) {
            this.loadLayout(currentLayout);
        }
    }
    
    captureDefaultLayout() {
        const layout = {
            name: 'Default',
            panels: this.capturePanelStates(),
            timestamp: Date.now()
        };
        this.defaultLayout = layout;
        if (!this.layouts.has('default')) {
            this.layouts.set('default', layout);
        }
    }
    
    capturePanelStates() {
        const panels = {};
        const panelElements = document.querySelectorAll('.panel, .sidebar, .tools-panel');
        
        panelElements.forEach(panel => {
            const id = panel.id || panel.className;
            panels[id] = {
                visible: panel.style.display !== 'none',
                position: {
                    top: panel.style.top || '',
                    left: panel.style.left || '',
                    right: panel.style.right || '',
                    bottom: panel.style.bottom || ''
                },
                size: {
                    width: panel.style.width || '',
                    height: panel.style.height || ''
                },
                order: panel.style.order || ''
            };
        });
        
        return panels;
    }
    
    saveLayout(name) {
        const layout = {
            name: name,
            panels: this.capturePanelStates(),
            timestamp: Date.now()
        };
        
        this.layouts.set(name, layout);
        this.saveLayoutsToStorage();
        return layout;
    }
    
    loadLayout(name) {
        const layout = this.layouts.get(name);
        if (!layout) {
            console.warn('Layout not found:', name);
            return false;
        }
        
        this.applyPanelStates(layout.panels);
        this.currentLayout = name;
        localStorage.setItem('artemis-current-layout', name);
        return true;
    }
    
    applyPanelStates(panels) {
        Object.entries(panels).forEach(([id, state]) => {
            const panel = document.getElementById(id) || document.querySelector(`.${id}`);
            if (panel) {
                panel.style.display = state.visible ? '' : 'none';
                
                if (state.position.top) panel.style.top = state.position.top;
                if (state.position.left) panel.style.left = state.position.left;
                if (state.position.right) panel.style.right = state.position.right;
                if (state.position.bottom) panel.style.bottom = state.position.bottom;
                
                if (state.size.width) panel.style.width = state.size.width;
                if (state.size.height) panel.style.height = state.size.height;
                
                if (state.order) panel.style.order = state.order;
            }
        });
    }
    
    deleteLayout(name) {
        if (name === 'default') {
            console.warn('Cannot delete default layout');
            return false;
        }
        
        this.layouts.delete(name);
        this.saveLayoutsToStorage();
        
        if (this.currentLayout === name) {
            this.loadLayout('default');
        }
        
        return true;
    }
    
    saveLayoutsToStorage() {
        const data = Object.fromEntries(this.layouts);
        localStorage.setItem('artemis-ui-layouts', JSON.stringify(data));
    }
    
    /**
     * Drag and Dock - Make panels draggable and dockable
     */
    initDragAndDock() {
        // Make panels draggable
        const panels = document.querySelectorAll('.panel, .sidebar, .tools-panel');
        
        panels.forEach(panel => {
            this.makePanelDraggable(panel);
        });
        
        // Create dock zones
        this.createDockZones();
    }
    
    makePanelDraggable(panel) {
        const header = panel.querySelector('.panel-header, .sidebar-header') || panel;
        
        header.style.cursor = 'move';
        header.setAttribute('draggable', 'true');
        
        header.addEventListener('dragstart', (e) => {
            this.draggedPanel = panel;
            panel.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
        });
        
        header.addEventListener('dragend', (e) => {
            panel.style.opacity = '';
            this.draggedPanel = null;
            this.hideDockZones();
        });
    }
    
    createDockZones() {
        const zones = ['top', 'right', 'bottom', 'left'];
        
        zones.forEach(zone => {
            const dockZone = document.createElement('div');
            dockZone.className = `dock-zone dock-zone-${zone}`;
            dockZone.style.cssText = `
                position: fixed;
                background: rgba(0, 122, 204, 0.3);
                border: 2px dashed #007acc;
                display: none;
                z-index: 10000;
            `;
            
            switch(zone) {
                case 'top':
                    dockZone.style.top = '0';
                    dockZone.style.left = '0';
                    dockZone.style.width = '100%';
                    dockZone.style.height = '100px';
                    break;
                case 'bottom':
                    dockZone.style.bottom = '0';
                    dockZone.style.left = '0';
                    dockZone.style.width = '100%';
                    dockZone.style.height = '100px';
                    break;
                case 'left':
                    dockZone.style.left = '0';
                    dockZone.style.top = '0';
                    dockZone.style.width = '200px';
                    dockZone.style.height = '100%';
                    break;
                case 'right':
                    dockZone.style.right = '0';
                    dockZone.style.top = '0';
                    dockZone.style.width = '200px';
                    dockZone.style.height = '100%';
                    break;
            }
            
            dockZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dockZone.style.background = 'rgba(0, 122, 204, 0.5)';
            });
            
            dockZone.addEventListener('dragleave', (e) => {
                dockZone.style.background = 'rgba(0, 122, 204, 0.3)';
            });
            
            dockZone.addEventListener('drop', (e) => {
                e.preventDefault();
                this.dockPanel(this.draggedPanel, zone);
            });
            
            document.body.appendChild(dockZone);
            this.dockZones.push(dockZone);
        });
    }
    
    showDockZones() {
        this.dockZones.forEach(zone => zone.style.display = 'block');
    }
    
    hideDockZones() {
        this.dockZones.forEach(zone => {
            zone.style.display = 'none';
            zone.style.background = 'rgba(0, 122, 204, 0.3)';
        });
    }
    
    dockPanel(panel, zone) {
        if (!panel) return;
        
        panel.style.position = 'fixed';
        
        switch(zone) {
            case 'top':
                panel.style.top = '30px';
                panel.style.left = '50%';
                panel.style.transform = 'translateX(-50%)';
                panel.style.bottom = 'auto';
                panel.style.right = 'auto';
                break;
            case 'bottom':
                panel.style.bottom = '0';
                panel.style.left = '50%';
                panel.style.transform = 'translateX(-50%)';
                panel.style.top = 'auto';
                panel.style.right = 'auto';
                break;
            case 'left':
                panel.style.left = '0';
                panel.style.top = '50%';
                panel.style.transform = 'translateY(-50%)';
                panel.style.right = 'auto';
                panel.style.bottom = 'auto';
                break;
            case 'right':
                panel.style.right = '0';
                panel.style.top = '50%';
                panel.style.transform = 'translateY(-50%)';
                panel.style.left = 'auto';
                panel.style.bottom = 'auto';
                break;
        }
    }
    
    /**
     * Compact Mode - Minimize UI chrome
     */
    initCompactMode() {
        const saved = localStorage.getItem('artemis-compact-mode');
        if (saved === 'true') {
            this.enableCompactMode();
        }
    }
    
    enableCompactMode() {
        this.compactMode = true;
        document.body.classList.add('compact-mode');
        
        // Hide less frequently used panels
        const panels = document.querySelectorAll('.panel.secondary, .info-panel');
        panels.forEach(panel => panel.style.display = 'none');
        
        // Reduce panel sizes
        const primaryPanels = document.querySelectorAll('.sidebar, .tools-panel');
        primaryPanels.forEach(panel => {
            panel.style.width = '50px';
            panel.classList.add('compact');
        });
        
        localStorage.setItem('artemis-compact-mode', 'true');
    }
    
    disableCompactMode() {
        this.compactMode = false;
        document.body.classList.remove('compact-mode');
        
        // Restore panels
        const panels = document.querySelectorAll('.panel.secondary, .info-panel');
        panels.forEach(panel => panel.style.display = '');
        
        // Restore panel sizes
        const primaryPanels = document.querySelectorAll('.sidebar, .tools-panel');
        primaryPanels.forEach(panel => {
            panel.style.width = '';
            panel.classList.remove('compact');
        });
        
        localStorage.setItem('artemis-compact-mode', 'false');
    }
    
    toggleCompactMode() {
        if (this.compactMode) {
            this.disableCompactMode();
        } else {
            this.enableCompactMode();
        }
    }
    
    /**
     * Touch-Optimized UI - Larger touch targets
     */
    detectTouchDevice() {
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isTouchDevice) {
            const autoEnable = localStorage.getItem('artemis-auto-touch-mode');
            if (autoEnable !== 'false') {
                this.enableTouchMode();
            }
        }
    }
    
    initTouchMode() {
        const saved = localStorage.getItem('artemis-touch-mode');
        if (saved === 'true') {
            this.enableTouchMode();
        }
    }
    
    enableTouchMode() {
        this.touchMode = true;
        document.body.classList.add('touch-mode');
        
        // Increase button sizes
        const buttons = document.querySelectorAll('button, .tool-btn, .icon-btn');
        buttons.forEach(btn => {
            btn.style.minWidth = '44px';
            btn.style.minHeight = '44px';
            btn.style.fontSize = '16px';
        });
        
        // Increase slider sizes
        const sliders = document.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            slider.style.height = '40px';
        });
        
        localStorage.setItem('artemis-touch-mode', 'true');
    }
    
    disableTouchMode() {
        this.touchMode = false;
        document.body.classList.remove('touch-mode');
        
        // Reset button sizes
        const buttons = document.querySelectorAll('button, .tool-btn, .icon-btn');
        buttons.forEach(btn => {
            btn.style.minWidth = '';
            btn.style.minHeight = '';
            btn.style.fontSize = '';
        });
        
        // Reset slider sizes
        const sliders = document.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            slider.style.height = '';
        });
        
        localStorage.setItem('artemis-touch-mode', 'false');
    }
    
    toggleTouchMode() {
        if (this.touchMode) {
            this.disableTouchMode();
        } else {
            this.enableTouchMode();
        }
    }
    
    /**
     * Custom Toolbars - Personalized tool access
     */
    initCustomToolbars() {
        this.loadCustomToolbars();
    }
    
    loadCustomToolbars() {
        const saved = localStorage.getItem('artemis-custom-toolbars');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.customToolbars = new Map(Object.entries(data));
            } catch (e) {
                console.error('Error loading custom toolbars:', e);
            }
        }
    }
    
    createCustomToolbar(name, tools) {
        const toolbar = {
            name: name,
            tools: tools,
            visible: true,
            position: { top: '100px', left: '100px' }
        };
        
        this.customToolbars.set(name, toolbar);
        this.saveCustomToolbars();
        this.renderCustomToolbar(name);
        
        return toolbar;
    }
    
    renderCustomToolbar(name) {
        const toolbar = this.customToolbars.get(name);
        if (!toolbar) return;
        
        const toolbarEl = document.createElement('div');
        toolbarEl.id = `custom-toolbar-${name}`;
        toolbarEl.className = 'custom-toolbar';
        toolbarEl.style.cssText = `
            position: fixed;
            top: ${toolbar.position.top};
            left: ${toolbar.position.left};
            background: var(--bg-secondary, #2d2d30);
            border: 1px solid var(--border-color, #3e3e42);
            border-radius: 6px;
            padding: 8px;
            display: ${toolbar.visible ? 'flex' : 'none'};
            gap: 4px;
            z-index: 1000;
            box-shadow: 0 2px 8px var(--shadow, rgba(0,0,0,0.5));
        `;
        
        // Add toolbar header
        const header = document.createElement('div');
        header.style.cssText = 'padding: 4px 8px; cursor: move; font-size: 12px; color: var(--text-secondary);';
        header.textContent = toolbar.name;
        toolbarEl.appendChild(header);
        
        // Add tools
        toolbar.tools.forEach(tool => {
            const btn = document.createElement('button');
            btn.className = 'tool-btn';
            btn.title = tool.name;
            btn.textContent = tool.icon || tool.name;
            btn.onclick = () => {
                if (typeof window[tool.action] === 'function') {
                    window[tool.action]();
                }
            };
            toolbarEl.appendChild(btn);
        });
        
        // Make draggable
        this.makePanelDraggable(toolbarEl);
        
        document.body.appendChild(toolbarEl);
    }
    
    deleteCustomToolbar(name) {
        this.customToolbars.delete(name);
        this.saveCustomToolbars();
        
        const toolbarEl = document.getElementById(`custom-toolbar-${name}`);
        if (toolbarEl) {
            toolbarEl.remove();
        }
    }
    
    saveCustomToolbars() {
        const data = Object.fromEntries(this.customToolbars);
        localStorage.setItem('artemis-custom-toolbars', JSON.stringify(data));
    }
    
    /**
     * UI Dialog Helpers
     */
    showLayoutManager() {
        const layouts = Array.from(this.layouts.entries());
        
        const dialog = document.createElement('div');
        dialog.className = 'dialog-overlay';
        dialog.innerHTML = `
            <div class="dialog-box" style="width: 600px;">
                <div class="dialog-header">
                    <h3>Manage UI Layouts</h3>
                    <button class="close-btn" onclick="this.closest('.dialog-overlay').remove()">×</button>
                </div>
                <div class="dialog-content">
                    <div style="margin-bottom: 20px;">
                        <h4>Current Layout: ${this.currentLayout}</h4>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <button class="btn" onclick="uiCustomization.saveCurrentLayout()">
                            Save Current Layout
                        </button>
                        <button class="btn" onclick="uiCustomization.toggleCompactMode(); this.textContent = uiCustomization.compactMode ? 'Disable Compact Mode' : 'Enable Compact Mode'">
                            ${this.compactMode ? 'Disable Compact Mode' : 'Enable Compact Mode'}
                        </button>
                    </div>
                    
                    <div class="layouts-list">
                        ${layouts.map(([name, layout]) => `
                            <div class="layout-item" style="padding: 12px; margin-bottom: 8px; background: var(--bg-tertiary); border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong>${layout.name}</strong>
                                    <div style="font-size: 12px; opacity: 0.7;">
                                        ${new Date(layout.timestamp).toLocaleString()}
                                    </div>
                                </div>
                                <div>
                                    <button class="btn btn-sm" onclick="uiCustomization.loadLayout('${name}'); this.closest('.dialog-overlay').remove();">
                                        Load
                                    </button>
                                    ${name !== 'default' ? `
                                        <button class="btn btn-sm btn-danger" onclick="uiCustomization.deleteLayout('${name}'); this.closest('.dialog-overlay').remove(); uiCustomization.showLayoutManager();">
                                            Delete
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
    }
    
    saveCurrentLayout() {
        const name = prompt('Enter a name for this layout:');
        if (name) {
            this.saveLayout(name);
            alert('Layout saved successfully!');
        }
    }
}

// Global instance
if (typeof window !== 'undefined') {
    window.uiCustomization = new UICustomization();
}
