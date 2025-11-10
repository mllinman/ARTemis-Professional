/**
 * ARTemis Professional - Panel Management System
 * Advanced modular panel system with docking, snapping, and combining
 * Similar to Photoshop's panel management
 */

class PanelManager {
    constructor() {
        this.panels = new Map(); // id -> panel config
        this.dockZones = new Map(); // zone id -> zone element
        this.snapThreshold = 15; // pixels
        this.draggedPanel = null;
        this.panelGroups = new Map(); // group id -> panel ids[]
        this.layouts = new Map();
        this.currentLayout = 'default';
        
        this.init();
    }
    
    init() {
        this.createDockZones();
        this.setupEventListeners();
        this.loadPanelStates();
        this.registerDefaultPanels();
        this.updateWindowsMenu();
    }
    
    /**
     * Register a panel with the manager
     */
    registerPanel(config) {
        const panelConfig = {
            id: config.id,
            title: config.title,
            element: config.element || document.getElementById(config.id),
            defaultPosition: config.defaultPosition || 'left',
            defaultSize: config.defaultSize || { width: 280, height: 'auto' },
            minSize: config.minSize || { width: 200, height: 100 },
            maxSize: config.maxSize || { width: 600, height: 800 },
            resizable: config.resizable !== false,
            collapsible: config.collapsible !== false,
            closable: config.closable !== false,
            floatable: config.floatable !== false,
            dockable: config.dockable !== false,
            groupable: config.groupable !== false,
            visible: config.visible !== false,
            collapsed: config.collapsed || false,
            docked: config.docked !== false,
            group: config.group || null,
            category: config.category || 'general',
            shortcut: config.shortcut || null,
            order: config.order || 0
        };
        
        this.panels.set(config.id, panelConfig);
        this.enhancePanel(panelConfig);
        return panelConfig;
    }
    
    /**
     * Enhance panel element with interactive features
     */
    enhancePanel(config) {
        const panel = config.element;
        if (!panel) return;
        
        // Add panel data attributes
        panel.dataset.panelId = config.id;
        panel.classList.add('modular-panel');
        
        // Ensure proper structure
        if (!panel.querySelector('.panel-header')) {
            this.createPanelHeader(panel, config);
        }
        
        // Make draggable
        if (config.dockable) {
            this.makePanelDraggable(panel, config);
        }
        
        // Make resizable
        if (config.resizable) {
            this.makePanelResizable(panel, config);
        }
        
        // Setup collapse/expand
        if (config.collapsible) {
            this.setupPanelCollapse(panel, config);
        }
        
        // Setup close button
        if (config.closable) {
            this.setupPanelClose(panel, config);
        }
        
        // Apply initial state
        this.applyPanelState(config);
    }
    
    /**
     * Create or enhance panel header
     */
    createPanelHeader(panel, config) {
        let header = panel.querySelector('.panel-header');
        if (!header) {
            header = document.createElement('div');
            header.className = 'panel-header';
            panel.insertBefore(header, panel.firstChild);
        }
        
        // Add title
        if (!header.querySelector('.panel-title')) {
            const title = document.createElement('span');
            title.className = 'panel-title';
            title.textContent = config.title;
            header.appendChild(title);
        }
        
        // Add controls container
        if (!header.querySelector('.panel-controls')) {
            const controls = document.createElement('div');
            controls.className = 'panel-controls';
            header.appendChild(controls);
        }
        
        const controls = header.querySelector('.panel-controls');
        
        // Add collapse button
        if (config.collapsible && !controls.querySelector('.panel-collapse-btn')) {
            const collapseBtn = document.createElement('button');
            collapseBtn.className = 'panel-collapse-btn';
            collapseBtn.innerHTML = '▼';
            collapseBtn.title = 'Collapse Panel';
            controls.appendChild(collapseBtn);
        }
        
        // Add float/dock button
        if (config.floatable && !controls.querySelector('.panel-float-btn')) {
            const floatBtn = document.createElement('button');
            floatBtn.className = 'panel-float-btn';
            floatBtn.innerHTML = '⧉';
            floatBtn.title = 'Float/Dock Panel';
            controls.appendChild(floatBtn);
        }
        
        // Add close button
        if (config.closable && !controls.querySelector('.panel-close-btn')) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'panel-close-btn';
            closeBtn.innerHTML = '✕';
            closeBtn.title = 'Close Panel';
            controls.appendChild(closeBtn);
        }
    }
    
    /**
     * Make panel draggable for docking
     */
    makePanelDraggable(panel, config) {
        const header = panel.querySelector('.panel-header');
        if (!header) return;
        
        let dragStartX, dragStartY, panelStartX, panelStartY;
        let isDragging = false;
        
        header.style.cursor = 'move';
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.panel-controls')) return;
            
            isDragging = true;
            this.draggedPanel = config;
            
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            
            const rect = panel.getBoundingClientRect();
            panelStartX = rect.left;
            panelStartY = rect.top;
            
            panel.classList.add('dragging');
            this.showSnapZones();
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging || this.draggedPanel !== config) return;
            
            const deltaX = e.clientX - dragStartX;
            const deltaY = e.clientY - dragStartY;
            
            // Make panel floating if it was docked
            if (config.docked) {
                panel.style.position = 'fixed';
                config.docked = false;
            }
            
            const newX = panelStartX + deltaX;
            const newY = panelStartY + deltaY;
            
            // Check for snap zones
            const snapResult = this.checkSnapZones(newX, newY, panel);
            if (snapResult) {
                this.highlightSnapZone(snapResult);
            } else {
                this.clearSnapZoneHighlights();
                panel.style.left = newX + 'px';
                panel.style.top = newY + 'px';
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (!isDragging || this.draggedPanel !== config) return;
            
            isDragging = false;
            panel.classList.remove('dragging');
            
            // Check if dropped on a snap zone
            const rect = panel.getBoundingClientRect();
            const snapResult = this.checkSnapZones(rect.left, rect.top, panel);
            if (snapResult) {
                this.dockPanel(config, snapResult);
            }
            
            this.hideSnapZones();
            this.clearSnapZoneHighlights();
            this.draggedPanel = null;
            
            this.savePanelStates();
        });
    }
    
    /**
     * Make panel resizable
     */
    makePanelResizable(panel, config) {
        const resizer = document.createElement('div');
        resizer.className = 'panel-resizer';
        panel.appendChild(resizer);
        
        let isResizing = false;
        let startX, startY, startWidth, startHeight;
        
        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = panel.offsetWidth;
            startHeight = panel.offsetHeight;
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            let newWidth = startWidth + deltaX;
            let newHeight = startHeight + deltaY;
            
            // Apply constraints
            if (config.minSize) {
                newWidth = Math.max(newWidth, config.minSize.width);
                newHeight = Math.max(newHeight, config.minSize.height);
            }
            if (config.maxSize) {
                newWidth = Math.min(newWidth, config.maxSize.width);
                newHeight = Math.min(newHeight, config.maxSize.height);
            }
            
            panel.style.width = newWidth + 'px';
            if (config.minSize.height !== 'auto') {
                panel.style.height = newHeight + 'px';
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                this.savePanelStates();
            }
        });
    }
    
    /**
     * Setup panel collapse/expand functionality
     */
    setupPanelCollapse(panel, config) {
        const collapseBtn = panel.querySelector('.panel-collapse-btn');
        if (!collapseBtn) return;
        
        collapseBtn.addEventListener('click', () => {
            this.togglePanelCollapse(config.id);
        });
    }
    
    /**
     * Setup panel close functionality
     */
    setupPanelClose(panel, config) {
        const closeBtn = panel.querySelector('.panel-close-btn');
        if (!closeBtn) return;
        
        closeBtn.addEventListener('click', () => {
            this.hidePanel(config.id);
        });
    }
    
    /**
     * Toggle panel collapse state
     */
    togglePanelCollapse(panelId) {
        const config = this.panels.get(panelId);
        if (!config) return;
        
        config.collapsed = !config.collapsed;
        config.element.classList.toggle('collapsed', config.collapsed);
        
        const collapseBtn = config.element.querySelector('.panel-collapse-btn');
        if (collapseBtn) {
            collapseBtn.innerHTML = config.collapsed ? '▶' : '▼';
            collapseBtn.title = config.collapsed ? 'Expand Panel' : 'Collapse Panel';
        }
        
        this.savePanelStates();
    }
    
    /**
     * Show panel
     */
    showPanel(panelId) {
        const config = this.panels.get(panelId);
        if (!config) return;
        
        config.visible = true;
        config.element.style.display = '';
        this.updateWindowsMenu();
        this.savePanelStates();
    }
    
    /**
     * Hide panel
     */
    hidePanel(panelId) {
        const config = this.panels.get(panelId);
        if (!config) return;
        
        config.visible = false;
        config.element.style.display = 'none';
        this.updateWindowsMenu();
        this.savePanelStates();
    }
    
    /**
     * Create snap zones for docking
     */
    createDockZones() {
        const zones = [
            { id: 'top', position: 'top', width: '100%', height: '60px', top: '0', left: '0' },
            { id: 'bottom', position: 'bottom', width: '100%', height: '60px', bottom: '0', left: '0' },
            { id: 'left', position: 'left', width: '60px', height: '100%', top: '0', left: '0' },
            { id: 'right', position: 'right', width: '60px', height: '100%', top: '0', right: '0' }
        ];
        
        zones.forEach(zone => {
            const element = document.createElement('div');
            element.className = 'dock-zone';
            element.dataset.position = zone.position;
            element.style.cssText = `
                position: fixed;
                background: rgba(0, 122, 204, 0.2);
                border: 2px dashed rgba(0, 122, 204, 0.5);
                display: none;
                z-index: 10000;
                pointer-events: none;
                transition: all 0.2s;
                width: ${zone.width};
                height: ${zone.height};
                ${zone.top !== undefined ? 'top: ' + zone.top + ';' : ''}
                ${zone.bottom !== undefined ? 'bottom: ' + zone.bottom + ';' : ''}
                ${zone.left !== undefined ? 'left: ' + zone.left + ';' : ''}
                ${zone.right !== undefined ? 'right: ' + zone.right + ';' : ''}
            `;
            
            document.body.appendChild(element);
            this.dockZones.set(zone.id, { element, config: zone });
        });
    }
    
    /**
     * Check if panel is near a snap zone
     */
    checkSnapZones(x, y, panel) {
        const threshold = this.snapThreshold;
        const panelRect = { left: x, top: y, width: panel.offsetWidth, height: panel.offsetHeight };
        
        for (const [zoneId, zone] of this.dockZones) {
            const zoneRect = zone.element.getBoundingClientRect();
            
            // Check if panel overlaps with zone
            if (this.checkOverlap(panelRect, zoneRect, threshold)) {
                return { zoneId, position: zone.config.position };
            }
        }
        
        return null;
    }
    
    /**
     * Check if two rectangles overlap
     */
    checkOverlap(rect1, rect2, threshold) {
        return !(rect1.left > rect2.right + threshold ||
                rect1.left + rect1.width < rect2.left - threshold ||
                rect1.top > rect2.bottom + threshold ||
                rect1.top + rect1.height < rect2.top - threshold);
    }
    
    /**
     * Show snap zones during drag
     */
    showSnapZones() {
        this.dockZones.forEach(zone => {
            zone.element.style.display = 'block';
        });
    }
    
    /**
     * Hide snap zones
     */
    hideSnapZones() {
        this.dockZones.forEach(zone => {
            zone.element.style.display = 'none';
        });
    }
    
    /**
     * Highlight a specific snap zone
     */
    highlightSnapZone(snapResult) {
        this.clearSnapZoneHighlights();
        const zone = this.dockZones.get(snapResult.zoneId);
        if (zone) {
            zone.element.style.background = 'rgba(0, 122, 204, 0.5)';
            zone.element.style.borderColor = 'rgba(0, 122, 204, 0.8)';
        }
    }
    
    /**
     * Clear all snap zone highlights
     */
    clearSnapZoneHighlights() {
        this.dockZones.forEach(zone => {
            zone.element.style.background = 'rgba(0, 122, 204, 0.2)';
            zone.element.style.borderColor = 'rgba(0, 122, 204, 0.5)';
        });
    }
    
    /**
     * Dock panel to a position
     */
    dockPanel(config, snapResult) {
        const panel = config.element;
        config.docked = true;
        config.dockPosition = snapResult.position;
        
        panel.style.position = 'relative';
        panel.style.transform = '';
        
        // Move panel to dock container
        const dockContainerId = snapResult.position === 'top' || snapResult.position === 'bottom' 
            ? `${snapResult.position}-dock-container` 
            : snapResult.position === 'left' 
                ? 'main-container' 
                : 'main-container';
        
        let dockContainer = document.getElementById(dockContainerId);
        if (!dockContainer) {
            dockContainer = this.createDockContainer(snapResult.position);
        }
        
        dockContainer.appendChild(panel);
        
        this.savePanelStates();
    }
    
    /**
     * Create dock container if it doesn't exist
     */
    createDockContainer(position) {
        const container = document.createElement('div');
        container.id = `${position}-dock-container`;
        container.className = 'dock-container';
        
        const mainContainer = document.getElementById('main-container');
        if (position === 'top') {
            mainContainer.parentNode.insertBefore(container, mainContainer);
        } else if (position === 'bottom') {
            mainContainer.parentNode.insertBefore(container, mainContainer.nextSibling);
        }
        
        return container;
    }
    
    /**
     * Apply saved panel state
     */
    applyPanelState(config) {
        const panel = config.element;
        if (!panel) return;
        
        panel.style.display = config.visible ? '' : 'none';
        panel.classList.toggle('collapsed', config.collapsed);
        
        if (config.docked) {
            // Panel is docked, position managed by container
        } else {
            // Panel is floating
            panel.style.position = 'fixed';
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });
    }
    
    /**
     * Handle window resize
     */
    handleWindowResize() {
        // Adjust floating panels if they're outside viewport
        this.panels.forEach(config => {
            if (!config.docked && config.visible) {
                const panel = config.element;
                const rect = panel.getBoundingClientRect();
                
                if (rect.left < 0) panel.style.left = '0px';
                if (rect.top < 0) panel.style.top = '0px';
                if (rect.right > window.innerWidth) {
                    panel.style.left = (window.innerWidth - rect.width) + 'px';
                }
                if (rect.bottom > window.innerHeight) {
                    panel.style.top = (window.innerHeight - rect.height) + 'px';
                }
            }
        });
    }
    
    /**
     * Register default panels from existing DOM
     */
    registerDefaultPanels() {
        // Register existing panels
        const panelElements = document.querySelectorAll('.panel');
        panelElements.forEach(panel => {
            if (!panel.id) return;
            
            const title = panel.querySelector('.panel-header')?.textContent?.trim() || panel.id;
            
            this.registerPanel({
                id: panel.id,
                title: title,
                element: panel,
                visible: panel.style.display !== 'none'
            });
        });
    }
    
    /**
     * Update Windows menu with panel toggles
     */
    updateWindowsMenu() {
        // Find Windows menu by checking all menu labels
        let windowsMenu = null;
        const menuLabels = document.querySelectorAll('.menu-label');
        for (const label of menuLabels) {
            if (label.textContent.trim() === 'Windows') {
                windowsMenu = label.parentElement;
                break;
            }
        }
        
        if (!windowsMenu) {
            // Menu doesn't exist yet, will be updated later
            return;
        }
        
        const dropdown = windowsMenu.querySelector('.menu-dropdown');
        if (!dropdown) return;
        
        // Find or create panels section
        let panelsSection = dropdown.querySelector('.panels-menu-section');
        if (!panelsSection) {
            // Add divider
            const divider = document.createElement('div');
            divider.className = 'menu-divider';
            dropdown.insertBefore(divider, dropdown.firstChild);
            
            panelsSection = document.createElement('div');
            panelsSection.className = 'panels-menu-section';
            dropdown.insertBefore(panelsSection, divider);
        }
        
        // Clear existing panel buttons
        panelsSection.innerHTML = '';
        
        // Group panels by category
        const categories = new Map();
        this.panels.forEach(config => {
            if (!categories.has(config.category)) {
                categories.set(config.category, []);
            }
            categories.get(config.category).push(config);
        });
        
        // Add panel buttons by category
        categories.forEach((panels, category) => {
            if (category !== 'general') {
                const categoryLabel = document.createElement('div');
                categoryLabel.className = 'menu-section-label';
                categoryLabel.textContent = category.charAt(0).toUpperCase() + category.slice(1);
                panelsSection.appendChild(categoryLabel);
            }
            
            panels.sort((a, b) => a.order - b.order).forEach(config => {
                const btn = document.createElement('button');
                btn.className = 'menu-btn';
                btn.dataset.action = `toggle-panel-${config.id}`;
                btn.innerHTML = `
                    <span class="panel-visibility-icon">${config.visible ? '✓' : ''}</span>
                    ${config.title}
                    ${config.shortcut ? `<span class="menu-shortcut">${config.shortcut}</span>` : ''}
                `;
                
                btn.addEventListener('click', () => {
                    if (config.visible) {
                        this.hidePanel(config.id);
                    } else {
                        this.showPanel(config.id);
                    }
                });
                
                panelsSection.appendChild(btn);
            });
        });
    }
    
    /**
     * Save panel states to localStorage
     */
    savePanelStates() {
        const states = {};
        this.panels.forEach((config, id) => {
            const panel = config.element;
            states[id] = {
                visible: config.visible,
                collapsed: config.collapsed,
                docked: config.docked,
                dockPosition: config.dockPosition,
                position: {
                    left: panel.style.left,
                    top: panel.style.top
                },
                size: {
                    width: panel.style.width,
                    height: panel.style.height
                }
            };
        });
        
        localStorage.setItem('artemis-panel-states', JSON.stringify(states));
    }
    
    /**
     * Load panel states from localStorage
     */
    loadPanelStates() {
        const saved = localStorage.getItem('artemis-panel-states');
        if (!saved) return;
        
        try {
            const states = JSON.parse(saved);
            Object.entries(states).forEach(([id, state]) => {
                const config = this.panels.get(id);
                if (!config) return;
                
                config.visible = state.visible;
                config.collapsed = state.collapsed;
                config.docked = state.docked;
                config.dockPosition = state.dockPosition;
                
                const panel = config.element;
                if (state.position.left) panel.style.left = state.position.left;
                if (state.position.top) panel.style.top = state.position.top;
                if (state.size.width) panel.style.width = state.size.width;
                if (state.size.height) panel.style.height = state.size.height;
                
                this.applyPanelState(config);
            });
        } catch (e) {
            console.error('Error loading panel states:', e);
        }
    }
    
    /**
     * Reset all panels to default layout
     */
    resetPanels() {
        this.panels.forEach(config => {
            config.visible = true;
            config.collapsed = false;
            config.docked = true;
            config.dockPosition = config.defaultPosition;
            
            this.applyPanelState(config);
        });
        
        this.savePanelStates();
        this.updateWindowsMenu();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PanelManager;
}
