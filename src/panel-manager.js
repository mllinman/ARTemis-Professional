/**
 * ARTemis Professional - Panel Management System
 * Advanced modular panel system with docking, snapping, and combining
 */

class PanelManager {
    constructor() {
        this.panels = new Map(); // id -> panel config
        this.dockZones = new Map(); // zone id -> zone element
        this.snapThreshold = 30; // pixels - increased for easier snapping
        this.draggedPanel = null;
        this.panelGroups = new Map(); // group id -> panel ids[]
        this.layouts = new Map();
        this.currentLayout = 'default';
        this.isResizing = false;
        this.isDragging = false;
        
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
     * Make panel draggable for docking with smooth motion
     */
    makePanelDraggable(panel, config) {
        const header = panel.querySelector('.panel-header');
        if (!header) return;
        
        let dragStartX, dragStartY, panelStartX, panelStartY;
        let isDragging = false;
        let animationFrame = null;
        
        header.style.cursor = 'move';
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.panel-controls')) return;
            
            isDragging = true;
            this.isDragging = true;
            this.draggedPanel = config;
            
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            
            const rect = panel.getBoundingClientRect();
            panelStartX = rect.left;
            panelStartY = rect.top;
            
            panel.classList.add('dragging');
            document.body.style.userSelect = 'none';
            
            // Slight delay before showing zones to avoid flicker
            setTimeout(() => {
                if (isDragging) {
                    this.showSnapZones();
                }
            }, 100);
            
            e.preventDefault();
            e.stopPropagation();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging || this.draggedPanel !== config) return;
            
            // Use requestAnimationFrame for smooth dragging
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
            
            animationFrame = requestAnimationFrame(() => {
                const deltaX = e.clientX - dragStartX;
                const deltaY = e.clientY - dragStartY;
                
                // Make panel floating if it was docked
                if (config.docked) {
                    panel.style.position = 'fixed';
                    panel.classList.add('floating');
                    config.docked = false;
                }
                
                const newX = panelStartX + deltaX;
                const newY = panelStartY + deltaY;
                
                // Keep panel within viewport bounds
                const maxX = window.innerWidth - panel.offsetWidth;
                const maxY = window.innerHeight - panel.offsetHeight;
                const constrainedX = Math.max(0, Math.min(newX, maxX));
                const constrainedY = Math.max(0, Math.min(newY, maxY));
                
                // Check for snap zones
                const snapResult = this.checkSnapZones(constrainedX, constrainedY, panel);
                if (snapResult) {
                    this.highlightSnapZone(snapResult);
                    // Show preview of where panel will dock
                    this.showDockPreview(snapResult, panel);
                } else {
                    this.clearSnapZoneHighlights();
                    this.hideDockPreview();
                    panel.style.left = constrainedX + 'px';
                    panel.style.top = constrainedY + 'px';
                }
            });
        });
        
        document.addEventListener('mouseup', (e) => {
            if (!isDragging || this.draggedPanel !== config) return;
            
            isDragging = false;
            this.isDragging = false;
            panel.classList.remove('dragging');
            document.body.style.userSelect = '';
            
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
                animationFrame = null;
            }
            
            // Check if dropped on a snap zone
            const rect = panel.getBoundingClientRect();
            const snapResult = this.checkSnapZones(rect.left, rect.top, panel);
            if (snapResult) {
                this.dockPanel(config, snapResult);
            } else {
                // Panel is now floating
                panel.classList.add('floating');
                panel.classList.remove('docked');
            }
            
            this.hideSnapZones();
            this.clearSnapZoneHighlights();
            this.hideDockPreview();
            this.draggedPanel = null;
            
            this.savePanelStates();
        });
    }
    
    /**
     * Make panel resizable with smooth constraints
     */
    makePanelResizable(panel, config) {
        const resizer = document.createElement('div');
        resizer.className = 'panel-resizer';
        panel.appendChild(resizer);
        
        let isResizing = false;
        let startX, startY, startWidth, startHeight;
        let animationFrame = null;
        
        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            this.isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = panel.offsetWidth;
            startHeight = panel.offsetHeight;
            
            panel.classList.add('resizing');
            document.body.style.cursor = 'nwse-resize';
            document.body.style.userSelect = 'none';
            
            e.preventDefault();
            e.stopPropagation();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            // Use requestAnimationFrame for smooth resizing
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
            
            animationFrame = requestAnimationFrame(() => {
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                let newWidth = startWidth + deltaX;
                let newHeight = startHeight + deltaY;
                
                // Apply constraints with snap to multiples of 20px for smoother feel
                if (config.minSize) {
                    newWidth = Math.max(newWidth, config.minSize.width);
                    newHeight = Math.max(newHeight, config.minSize.height);
                }
                if (config.maxSize) {
                    newWidth = Math.min(newWidth, config.maxSize.width);
                    newHeight = Math.min(newHeight, config.maxSize.height);
                }
                
                // Snap to 10px increments for cleaner sizing
                newWidth = Math.round(newWidth / 10) * 10;
                newHeight = Math.round(newHeight / 10) * 10;
                
                panel.style.width = newWidth + 'px';
                if (config.minSize.height !== 'auto') {
                    panel.style.height = newHeight + 'px';
                }
            });
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                this.isResizing = false;
                panel.classList.remove('resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                
                if (animationFrame) {
                    cancelAnimationFrame(animationFrame);
                    animationFrame = null;
                }
                
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
        // Get menu bar and toolbar heights for proper positioning
        const menuBar = document.getElementById('menu-bar');
        const toolbar = document.getElementById('toolbar');
        const contextBar = document.getElementById('contextual-taskbar');
        
        const topOffset = (menuBar?.offsetHeight || 0) + (toolbar?.offsetHeight || 0) + (contextBar?.offsetHeight || 0);
        
        const zones = [
            { id: 'top', position: 'top', width: '100%', height: '80px', top: topOffset + 'px', left: '0' },
            { id: 'bottom', position: 'bottom', width: '100%', height: '80px', bottom: '0', left: '0' },
            { id: 'left', position: 'left', width: '80px', height: 'calc(100% - ' + topOffset + 'px)', top: topOffset + 'px', left: '0' },
            { id: 'right', position: 'right', width: '80px', height: 'calc(100% - ' + topOffset + 'px)', top: topOffset + 'px', right: '0' }
        ];
        
        zones.forEach(zone => {
            const element = document.createElement('div');
            element.className = 'dock-zone';
            element.dataset.position = zone.position;
            element.style.cssText = `
                position: fixed;
                background: rgba(0, 122, 204, 0.15);
                border: 3px dashed rgba(0, 122, 204, 0.6);
                display: none;
                z-index: 9998;
                pointer-events: none;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                border-radius: 8px;
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
        
        // Create dock preview element
        this.dockPreview = document.createElement('div');
        this.dockPreview.className = 'dock-preview';
        this.dockPreview.style.cssText = `
            position: fixed;
            background: rgba(0, 122, 204, 0.2);
            border: 2px solid rgba(0, 122, 204, 0.8);
            display: none;
            z-index: 9997;
            pointer-events: none;
            border-radius: 4px;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        `;
        document.body.appendChild(this.dockPreview);
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
            zone.element.classList.add('highlight');
        }
    }
    
    /**
     * Show dock preview
     */
    showDockPreview(snapResult, panel) {
        if (!this.dockPreview) return;
        
        const zone = this.dockZones.get(snapResult.zoneId);
        if (!zone) return;
        
        const zoneRect = zone.element.getBoundingClientRect();
        const panelWidth = panel.offsetWidth;
        const panelHeight = panel.offsetHeight;
        
        let previewStyle = {
            display: 'block'
        };
        
        switch (snapResult.position) {
            case 'top':
                previewStyle.left = '0px';
                previewStyle.top = zoneRect.top + 'px';
                previewStyle.width = '100%';
                previewStyle.height = Math.min(panelHeight, 300) + 'px';
                break;
            case 'bottom':
                previewStyle.left = '0px';
                previewStyle.bottom = '0px';
                previewStyle.width = '100%';
                previewStyle.height = Math.min(panelHeight, 300) + 'px';
                break;
            case 'left':
                previewStyle.left = '0px';
                previewStyle.top = zoneRect.top + 'px';
                previewStyle.width = Math.min(panelWidth, 400) + 'px';
                previewStyle.height = 'calc(100% - ' + zoneRect.top + 'px)';
                break;
            case 'right':
                previewStyle.right = '0px';
                previewStyle.top = zoneRect.top + 'px';
                previewStyle.width = Math.min(panelWidth, 400) + 'px';
                previewStyle.height = 'calc(100% - ' + zoneRect.top + 'px)';
                break;
        }
        
        Object.assign(this.dockPreview.style, previewStyle);
    }
    
    /**
     * Hide dock preview
     */
    hideDockPreview() {
        if (this.dockPreview) {
            this.dockPreview.style.display = 'none';
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
    
    /**
     * Create panel group with tabs
     */
    createPanelGroup(panelIds, containerId) {
        const groupId = 'group-' + Date.now();
        const container = document.getElementById(containerId);
        if (!container) return null;
        
        const groupElement = document.createElement('div');
        groupElement.className = 'panel-group';
        groupElement.dataset.groupId = groupId;
        
        // Create tab bar
        const tabBar = document.createElement('div');
        tabBar.className = 'panel-tabs';
        groupElement.appendChild(tabBar);
        
        // Create content container
        const contentContainer = document.createElement('div');
        contentContainer.className = 'panel-group-content';
        groupElement.appendChild(contentContainer);
        
        // Add panels to group
        panelIds.forEach((panelId, index) => {
            const config = this.panels.get(panelId);
            if (!config) return;
            
            // Create tab
            const tab = document.createElement('button');
            tab.className = 'panel-tab' + (index === 0 ? ' active' : '');
            tab.dataset.panelId = panelId;
            tab.innerHTML = `
                ${config.title}
                <span class="panel-tab-close">✕</span>
            `;
            
            tab.addEventListener('click', (e) => {
                if (e.target.classList.contains('panel-tab-close')) {
                    this.removeFromGroup(groupId, panelId);
                } else {
                    this.switchGroupTab(groupId, panelId);
                }
            });
            
            tabBar.appendChild(tab);
            
            // Add panel to content
            const panel = config.element;
            panel.classList.add(index === 0 ? 'active' : '');
            contentContainer.appendChild(panel);
        });
        
        container.appendChild(groupElement);
        this.panelGroups.set(groupId, { panelIds, element: groupElement });
        
        return groupId;
    }
    
    /**
     * Switch active tab in a panel group
     */
    switchGroupTab(groupId, panelId) {
        const group = this.panelGroups.get(groupId);
        if (!group) return;
        
        const tabs = group.element.querySelectorAll('.panel-tab');
        const panels = group.element.querySelectorAll('.modular-panel');
        
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.panelId === panelId);
        });
        
        panels.forEach(panel => {
            panel.classList.toggle('active', panel.dataset.panelId === panelId);
        });
    }
    
    /**
     * Remove panel from group
     */
    removeFromGroup(groupId, panelId) {
        const group = this.panelGroups.get(groupId);
        if (!group) return;
        
        const index = group.panelIds.indexOf(panelId);
        if (index > -1) {
            group.panelIds.splice(index, 1);
        }
        
        // Remove tab
        const tab = group.element.querySelector(`.panel-tab[data-panel-id="${panelId}"]`);
        if (tab) tab.remove();
        
        // Remove panel from content
        const config = this.panels.get(panelId);
        if (config) {
            const panel = config.element;
            panel.classList.remove('active');
            
            // Make panel floating
            panel.style.position = 'fixed';
            panel.style.left = '50%';
            panel.style.top = '50%';
            panel.style.transform = 'translate(-50%, -50%)';
            panel.classList.add('floating');
            document.body.appendChild(panel);
            
            config.docked = false;
        }
        
        // If only one panel left, dissolve group
        if (group.panelIds.length === 1) {
            const lastPanelId = group.panelIds[0];
            const lastConfig = this.panels.get(lastPanelId);
            if (lastConfig) {
                const lastPanel = lastConfig.element;
                lastPanel.classList.remove('active');
                group.element.parentNode.appendChild(lastPanel);
            }
            group.element.remove();
            this.panelGroups.delete(groupId);
        }
        
        this.savePanelStates();
    }
    
    /**
     * Add panel to existing group
     */
    addToGroup(groupId, panelId) {
        const group = this.panelGroups.get(groupId);
        const config = this.panels.get(panelId);
        
        if (!group || !config) return;
        
        group.panelIds.push(panelId);
        
        // Create tab
        const tabBar = group.element.querySelector('.panel-tabs');
        const tab = document.createElement('button');
        tab.className = 'panel-tab';
        tab.dataset.panelId = panelId;
        tab.innerHTML = `
            ${config.title}
            <span class="panel-tab-close">✕</span>
        `;
        
        tab.addEventListener('click', (e) => {
            if (e.target.classList.contains('panel-tab-close')) {
                this.removeFromGroup(groupId, panelId);
            } else {
                this.switchGroupTab(groupId, panelId);
            }
        });
        
        tabBar.appendChild(tab);
        
        // Add panel to content
        const contentContainer = group.element.querySelector('.panel-group-content');
        const panel = config.element;
        contentContainer.appendChild(panel);
        
        this.savePanelStates();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PanelManager;
}
