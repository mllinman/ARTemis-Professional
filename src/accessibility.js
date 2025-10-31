/**
 * ARTemis Professional - Accessibility Module
 * Category 15: UI/UX & Accessibility
 * Implements screen reader support, keyboard navigation, and accessibility features
 */

class Accessibility {
    constructor() {
        this.highContrastMode = false;
        this.screenReaderEnabled = false;
        this.keyboardNavigationEnabled = true;
        this.colorBlindMode = 'none'; // 'none', 'protanopia', 'deuteranopia', 'tritanopia'
        this.uiZoomLevel = 100;
        this.focusIndicatorEnabled = true;
        this.announcements = [];
        
        this.init();
    }
    
    init() {
        this.loadPreferences();
        this.initHighContrastMode();
        this.initScreenReaderSupport();
        this.initKeyboardNavigation();
        this.initColorBlindModes();
        this.initUIZoom();
        this.detectAccessibilityNeeds();
    }
    
    loadPreferences() {
        const saved = localStorage.getItem('artemis-accessibility-preferences');
        if (saved) {
            try {
                const prefs = JSON.parse(saved);
                this.highContrastMode = prefs.highContrastMode || false;
                this.screenReaderEnabled = prefs.screenReaderEnabled || false;
                this.keyboardNavigationEnabled = prefs.keyboardNavigationEnabled !== false;
                this.colorBlindMode = prefs.colorBlindMode || 'none';
                this.uiZoomLevel = prefs.uiZoomLevel || 100;
            } catch (e) {
                console.error('Error loading accessibility preferences:', e);
            }
        }
    }
    
    savePreferences() {
        const prefs = {
            highContrastMode: this.highContrastMode,
            screenReaderEnabled: this.screenReaderEnabled,
            keyboardNavigationEnabled: this.keyboardNavigationEnabled,
            colorBlindMode: this.colorBlindMode,
            uiZoomLevel: this.uiZoomLevel
        };
        localStorage.setItem('artemis-accessibility-preferences', JSON.stringify(prefs));
    }
    
    /**
     * High Contrast Mode
     */
    initHighContrastMode() {
        if (this.highContrastMode) {
            this.enableHighContrastMode();
        }
    }
    
    enableHighContrastMode() {
        this.highContrastMode = true;
        document.body.classList.add('high-contrast-mode');
        
        // Apply high contrast theme
        document.documentElement.style.setProperty('--bg-primary', '#000000');
        document.documentElement.style.setProperty('--bg-secondary', '#1a1a1a');
        document.documentElement.style.setProperty('--bg-tertiary', '#0d0d0d');
        document.documentElement.style.setProperty('--border-color', '#ffffff');
        document.documentElement.style.setProperty('--text-primary', '#ffffff');
        document.documentElement.style.setProperty('--text-secondary', '#d0d0d0');
        document.documentElement.style.setProperty('--hover-bg', '#333333');
        document.documentElement.style.setProperty('--accent-color', '#00ffff');
        
        // Increase border visibility
        const elements = document.querySelectorAll('button, input, select, .panel, .dialog-box');
        elements.forEach(el => {
            el.style.border = '2px solid #ffffff';
        });
        
        this.announce('High contrast mode enabled');
        this.savePreferences();
    }
    
    disableHighContrastMode() {
        this.highContrastMode = false;
        document.body.classList.remove('high-contrast-mode');
        
        // Restore original theme
        if (typeof window.loadThemePreset === 'function') {
            const savedTheme = localStorage.getItem('artemis-theme') || 'dark';
            window.loadThemePreset(savedTheme);
        }
        
        // Reset borders
        const elements = document.querySelectorAll('button, input, select, .panel, .dialog-box');
        elements.forEach(el => {
            el.style.border = '';
        });
        
        this.announce('High contrast mode disabled');
        this.savePreferences();
    }
    
    toggleHighContrastMode() {
        if (this.highContrastMode) {
            this.disableHighContrastMode();
        } else {
            this.enableHighContrastMode();
        }
    }
    
    /**
     * Screen Reader Support
     */
    initScreenReaderSupport() {
        if (this.screenReaderEnabled) {
            this.enableScreenReaderSupport();
        }
    }
    
    enableScreenReaderSupport() {
        this.screenReaderEnabled = true;
        
        // Add ARIA labels to all interactive elements
        this.addAriaLabels();
        
        // Create live region for announcements
        this.createLiveRegion();
        
        // Add role attributes
        this.addRoleAttributes();
        
        // Add focus indicators
        this.enhanceFocusIndicators();
        
        this.announce('Screen reader support enabled');
        this.savePreferences();
    }
    
    disableScreenReaderSupport() {
        this.screenReaderEnabled = false;
        
        const liveRegion = document.getElementById('aria-live-region');
        if (liveRegion) {
            liveRegion.remove();
        }
        
        this.savePreferences();
    }
    
    addAriaLabels() {
        // Label buttons without text
        const buttons = document.querySelectorAll('button:not([aria-label])');
        buttons.forEach(btn => {
            const title = btn.title || btn.getAttribute('data-action') || 'Button';
            btn.setAttribute('aria-label', title);
        });
        
        // Label input fields
        const inputs = document.querySelectorAll('input:not([aria-label]):not([id])');
        inputs.forEach(input => {
            const label = input.previousElementSibling;
            if (label && label.tagName === 'LABEL') {
                const id = 'input-' + Math.random().toString(36).substr(2, 9);
                input.id = id;
                label.setAttribute('for', id);
            } else {
                input.setAttribute('aria-label', input.placeholder || input.type);
            }
        });
        
        // Label sliders
        const sliders = document.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            if (!slider.hasAttribute('aria-label')) {
                const label = slider.previousElementSibling;
                const labelText = label ? label.textContent : slider.id || 'Slider';
                slider.setAttribute('aria-label', labelText);
                slider.setAttribute('aria-valuemin', slider.min);
                slider.setAttribute('aria-valuemax', slider.max);
                slider.setAttribute('aria-valuenow', slider.value);
                
                slider.addEventListener('input', () => {
                    slider.setAttribute('aria-valuenow', slider.value);
                });
            }
        });
        
        // Label canvas
        const canvas = document.querySelector('canvas');
        if (canvas && !canvas.hasAttribute('aria-label')) {
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('aria-label', 'Drawing canvas');
        }
    }
    
    addRoleAttributes() {
        // Add roles to semantic elements
        const panels = document.querySelectorAll('.panel, .sidebar');
        panels.forEach(panel => {
            if (!panel.hasAttribute('role')) {
                panel.setAttribute('role', 'region');
                const header = panel.querySelector('h2, h3, .panel-header');
                if (header) {
                    const id = 'region-' + Math.random().toString(36).substr(2, 9);
                    header.id = id;
                    panel.setAttribute('aria-labelledby', id);
                }
            }
        });
        
        // Add navigation role to menus
        const menus = document.querySelectorAll('.menu-bar, #menu-bar');
        menus.forEach(menu => {
            menu.setAttribute('role', 'navigation');
            menu.setAttribute('aria-label', 'Main menu');
        });
        
        // Add toolbar role
        const toolbars = document.querySelectorAll('.toolbar, .tools-panel');
        toolbars.forEach(toolbar => {
            toolbar.setAttribute('role', 'toolbar');
            toolbar.setAttribute('aria-label', 'Tools');
        });
    }
    
    createLiveRegion() {
        let liveRegion = document.getElementById('aria-live-region');
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'aria-live-region';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
            document.body.appendChild(liveRegion);
        }
        return liveRegion;
    }
    
    announce(message) {
        if (!this.screenReaderEnabled) return;
        
        const liveRegion = this.createLiveRegion();
        liveRegion.textContent = message;
        
        this.announcements.push({
            message: message,
            timestamp: Date.now()
        });
        
        // Keep only last 20 announcements
        if (this.announcements.length > 20) {
            this.announcements.shift();
        }
    }
    
    enhanceFocusIndicators() {
        const style = document.createElement('style');
        style.id = 'accessibility-focus-styles';
        style.textContent = `
            *:focus {
                outline: 3px solid #00ffff !important;
                outline-offset: 2px !important;
            }
            
            button:focus, a:focus, input:focus, select:focus, textarea:focus {
                box-shadow: 0 0 0 3px rgba(0, 255, 255, 0.5) !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Keyboard Navigation
     */
    initKeyboardNavigation() {
        if (this.keyboardNavigationEnabled) {
            this.enableKeyboardNavigation();
        }
    }
    
    enableKeyboardNavigation() {
        this.keyboardNavigationEnabled = true;
        
        // Make all interactive elements tabbable
        this.makeElementsTabbable();
        
        // Add keyboard shortcuts help
        this.addKeyboardShortcutsHelp();
        
        // Trap focus in dialogs
        this.setupDialogFocusTrap();
        
        this.savePreferences();
    }
    
    makeElementsTabbable() {
        const elements = document.querySelectorAll('button, a, input, select, textarea, [role="button"]');
        let tabIndex = 0;
        
        elements.forEach(el => {
            if (!el.hasAttribute('tabindex') && !el.disabled) {
                el.setAttribute('tabindex', tabIndex++);
            }
        });
    }
    
    addKeyboardShortcutsHelp() {
        // Add keyboard navigation hints
        document.addEventListener('keydown', (e) => {
            // F1 for help
            if (e.key === 'F1') {
                e.preventDefault();
                this.showKeyboardShortcutsHelp();
            }
            
            // Escape to close dialogs
            if (e.key === 'Escape') {
                const dialog = document.querySelector('.dialog-overlay');
                if (dialog) {
                    dialog.remove();
                    this.announce('Dialog closed');
                }
            }
            
            // Tab navigation announcement
            if (e.key === 'Tab') {
                setTimeout(() => {
                    const focused = document.activeElement;
                    if (focused) {
                        const label = focused.getAttribute('aria-label') || 
                                    focused.textContent || 
                                    focused.title || 
                                    focused.tagName;
                        this.announce(`Focused on ${label}`);
                    }
                }, 100);
            }
        });
    }
    
    setupDialogFocusTrap() {
        // Trap focus within dialogs
        document.addEventListener('focusin', (e) => {
            const dialog = e.target.closest('.dialog-overlay');
            if (dialog) {
                const focusableElements = dialog.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];
                
                if (e.target === dialog && firstElement) {
                    firstElement.focus();
                }
            }
        });
    }
    
    showKeyboardShortcutsHelp() {
        const dialog = document.createElement('div');
        dialog.className = 'dialog-overlay';
        dialog.innerHTML = `
            <div class="dialog-box" style="width: 600px; max-height: 80vh; overflow-y: auto;">
                <div class="dialog-header">
                    <h3>Keyboard Shortcuts</h3>
                    <button class="close-btn" onclick="this.closest('.dialog-overlay').remove()">×</button>
                </div>
                <div class="dialog-content">
                    <h4>Navigation</h4>
                    <ul>
                        <li><kbd>Tab</kbd> - Move to next element</li>
                        <li><kbd>Shift+Tab</kbd> - Move to previous element</li>
                        <li><kbd>Enter</kbd> or <kbd>Space</kbd> - Activate button</li>
                        <li><kbd>Escape</kbd> - Close dialog or cancel</li>
                        <li><kbd>F1</kbd> - Show this help</li>
                    </ul>
                    
                    <h4>Canvas</h4>
                    <ul>
                        <li><kbd>Ctrl+N</kbd> - New canvas</li>
                        <li><kbd>Ctrl+O</kbd> - Open file</li>
                        <li><kbd>Ctrl+S</kbd> - Save</li>
                        <li><kbd>Ctrl+Z</kbd> - Undo</li>
                        <li><kbd>Ctrl+Y</kbd> - Redo</li>
                    </ul>
                    
                    <h4>View</h4>
                    <ul>
                        <li><kbd>Ctrl++</kbd> - Zoom in</li>
                        <li><kbd>Ctrl+-</kbd> - Zoom out</li>
                        <li><kbd>Ctrl+0</kbd> - Reset zoom</li>
                        <li><kbd>Space+Drag</kbd> - Pan canvas</li>
                    </ul>
                    
                    <h4>Accessibility</h4>
                    <ul>
                        <li><kbd>Alt+H</kbd> - Toggle high contrast mode</li>
                        <li><kbd>Alt+K</kbd> - Show keyboard shortcuts</li>
                    </ul>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Focus first button
        const firstButton = dialog.querySelector('button');
        if (firstButton) {
            firstButton.focus();
        }
    }
    
    /**
     * Color Blind Modes
     */
    initColorBlindModes() {
        if (this.colorBlindMode !== 'none') {
            this.applyColorBlindMode(this.colorBlindMode);
        }
    }
    
    applyColorBlindMode(mode) {
        this.colorBlindMode = mode;
        
        // Remove existing filter
        const existing = document.getElementById('colorblind-filter-style');
        if (existing) {
            existing.remove();
        }
        
        if (mode === 'none') {
            this.announce('Color blind mode disabled');
            this.savePreferences();
            return;
        }
        
        // Apply SVG filter for color blindness simulation
        const filters = {
            'protanopia': {
                // Red-blind
                matrix: '0.567, 0.433, 0, 0, 0, 0.558, 0.442, 0, 0, 0, 0, 0.242, 0.758, 0, 0, 0, 0, 0, 1, 0'
            },
            'deuteranopia': {
                // Green-blind
                matrix: '0.625, 0.375, 0, 0, 0, 0.7, 0.3, 0, 0, 0, 0, 0.3, 0.7, 0, 0, 0, 0, 0, 1, 0'
            },
            'tritanopia': {
                // Blue-blind
                matrix: '0.95, 0.05, 0, 0, 0, 0, 0.433, 0.567, 0, 0, 0, 0.475, 0.525, 0, 0, 0, 0, 0, 1, 0'
            }
        };
        
        const filter = filters[mode];
        if (!filter) return;
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.cssText = 'position: absolute; width: 0; height: 0;';
        svg.innerHTML = `
            <defs>
                <filter id="colorblind-filter">
                    <feColorMatrix type="matrix" values="${filter.matrix}"/>
                </filter>
            </defs>
        `;
        document.body.appendChild(svg);
        
        const style = document.createElement('style');
        style.id = 'colorblind-filter-style';
        style.textContent = `
            body { filter: url(#colorblind-filter); }
        `;
        document.head.appendChild(style);
        
        const modeNames = {
            'protanopia': 'Protanopia (Red-blind)',
            'deuteranopia': 'Deuteranopia (Green-blind)',
            'tritanopia': 'Tritanopia (Blue-blind)'
        };
        
        this.announce(`Color blind mode enabled: ${modeNames[mode]}`);
        this.savePreferences();
    }
    
    /**
     * UI Zoom
     */
    initUIZoom() {
        this.applyUIZoom(this.uiZoomLevel);
    }
    
    applyUIZoom(level) {
        this.uiZoomLevel = Math.max(75, Math.min(200, level));
        
        const scale = this.uiZoomLevel / 100;
        
        // Apply zoom to UI elements (not canvas)
        const panels = document.querySelectorAll('.panel, .sidebar, .toolbar, .menu-bar, .dialog-box');
        panels.forEach(panel => {
            panel.style.fontSize = `${14 * scale}px`;
        });
        
        const buttons = document.querySelectorAll('button, .btn');
        buttons.forEach(btn => {
            const currentSize = parseInt(window.getComputedStyle(btn).fontSize);
            btn.style.fontSize = `${currentSize * scale}px`;
        });
        
        this.announce(`UI zoom set to ${this.uiZoomLevel}%`);
        this.savePreferences();
    }
    
    increaseUIZoom() {
        this.applyUIZoom(this.uiZoomLevel + 10);
    }
    
    decreaseUIZoom() {
        this.applyUIZoom(this.uiZoomLevel - 10);
    }
    
    resetUIZoom() {
        this.applyUIZoom(100);
    }
    
    /**
     * Auto-detect accessibility needs
     */
    detectAccessibilityNeeds() {
        // Detect if user prefers reduced motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.body.classList.add('reduce-motion');
            this.announce('Reduced motion detected and applied');
        }
        
        // Detect if user prefers high contrast
        if (window.matchMedia('(prefers-contrast: high)').matches) {
            if (!this.highContrastMode) {
                const autoEnable = confirm('High contrast preference detected. Enable high contrast mode?');
                if (autoEnable) {
                    this.enableHighContrastMode();
                }
            }
        }
        
        // Detect screen reader
        // Note: This is a heuristic, not 100% accurate
        const hasScreenReader = navigator.userAgent.includes('JAWS') || 
                               navigator.userAgent.includes('NVDA') ||
                               navigator.userAgent.includes('VoiceOver');
        if (hasScreenReader && !this.screenReaderEnabled) {
            const autoEnable = confirm('Screen reader detected. Enable screen reader support?');
            if (autoEnable) {
                this.enableScreenReaderSupport();
            }
        }
    }
    
    /**
     * Accessibility Settings Dialog
     */
    showAccessibilitySettings() {
        const dialog = document.createElement('div');
        dialog.className = 'dialog-overlay';
        dialog.innerHTML = `
            <div class="dialog-box" style="width: 600px; max-height: 80vh; overflow-y: auto;">
                <div class="dialog-header">
                    <h3>Accessibility Settings</h3>
                    <button class="close-btn" onclick="this.closest('.dialog-overlay').remove()">×</button>
                </div>
                <div class="dialog-content">
                    <h4>Visual Accessibility</h4>
                    <div style="margin-bottom: 20px;">
                        <label style="display: flex; align-items: center; margin-bottom: 10px;">
                            <input type="checkbox" ${this.highContrastMode ? 'checked' : ''} 
                                   onchange="accessibility.toggleHighContrastMode()">
                            <span style="margin-left: 8px;">High Contrast Mode</span>
                        </label>
                        
                        <label style="display: block; margin-bottom: 10px;">
                            Color Blind Mode:
                            <select onchange="accessibility.applyColorBlindMode(this.value)" style="margin-left: 8px;">
                                <option value="none" ${this.colorBlindMode === 'none' ? 'selected' : ''}>None</option>
                                <option value="protanopia" ${this.colorBlindMode === 'protanopia' ? 'selected' : ''}>Protanopia (Red-blind)</option>
                                <option value="deuteranopia" ${this.colorBlindMode === 'deuteranopia' ? 'selected' : ''}>Deuteranopia (Green-blind)</option>
                                <option value="tritanopia" ${this.colorBlindMode === 'tritanopia' ? 'selected' : ''}>Tritanopia (Blue-blind)</option>
                            </select>
                        </label>
                        
                        <label style="display: block; margin-bottom: 10px;">
                            UI Zoom: ${this.uiZoomLevel}%
                            <input type="range" min="75" max="200" value="${this.uiZoomLevel}" 
                                   oninput="accessibility.applyUIZoom(this.value); this.previousElementSibling.textContent = 'UI Zoom: ' + this.value + '%'">
                        </label>
                    </div>
                    
                    <h4>Screen Reader Support</h4>
                    <div style="margin-bottom: 20px;">
                        <label style="display: flex; align-items: center; margin-bottom: 10px;">
                            <input type="checkbox" ${this.screenReaderEnabled ? 'checked' : ''} 
                                   onchange="accessibility.screenReaderEnabled ? accessibility.disableScreenReaderSupport() : accessibility.enableScreenReaderSupport()">
                            <span style="margin-left: 8px;">Enable Screen Reader Support</span>
                        </label>
                    </div>
                    
                    <h4>Keyboard Navigation</h4>
                    <div style="margin-bottom: 20px;">
                        <button class="btn" onclick="accessibility.showKeyboardShortcutsHelp()">
                            View Keyboard Shortcuts (F1)
                        </button>
                    </div>
                    
                    <div style="margin-top: 20px; padding: 15px; background: var(--bg-tertiary); border-radius: 4px;">
                        <p style="margin: 0; font-size: 14px; opacity: 0.8;">
                            ARTemis is committed to providing an accessible experience for all users. 
                            These settings help customize the interface for your needs.
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Focus first interactive element
        const firstInput = dialog.querySelector('input, button');
        if (firstInput) {
            firstInput.focus();
        }
    }
}

// Global instance
if (typeof window !== 'undefined') {
    window.accessibility = new Accessibility();
    
    // Add global keyboard shortcut
    document.addEventListener('keydown', (e) => {
        // Alt+H for high contrast
        if (e.altKey && e.key === 'h') {
            e.preventDefault();
            window.accessibility.toggleHighContrastMode();
        }
        
        // Alt+K for keyboard shortcuts
        if (e.altKey && e.key === 'k') {
            e.preventDefault();
            window.accessibility.showKeyboardShortcutsHelp();
        }
    });
}
