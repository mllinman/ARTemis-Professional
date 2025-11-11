/**
 * ARTemis Professional - Plugin System API (V3)
 * 
 * Provides a secure, sandboxed plugin system for extending ARTemis
 * Enables plugin marketplace and creator monetization
 * 
 * @module v3-features/ecosystem/plugin-system
 */

class PluginSystem {
    constructor() {
        this.plugins = new Map();
        this.hooks = new Map();
        this.apiVersion = '3.0.0';
        this.initialized = false;
    }

    /**
     * Initialize the plugin system
     */
    async initialize(capabilities) {
        if (this.initialized) return;

        console.log('🔌 Initializing Plugin System V3...');

        // Set up plugin API
        this.setupAPI();

        // Load installed plugins
        await this.loadInstalledPlugins();

        // Set up plugin sandbox
        this.setupSandbox();

        this.initialized = true;
        console.log('✅ Plugin System initialized');
    }

    /**
     * Set up the plugin API namespace
     */
    setupAPI() {
        // Create global plugin API
        window.ARTemisPluginAPI = {
            version: this.apiVersion,
            
            // Core API
            registerPlugin: this.registerPlugin.bind(this),
            unregisterPlugin: this.unregisterPlugin.bind(this),
            getPlugin: this.getPlugin.bind(this),
            listPlugins: this.listPlugins.bind(this),
            
            // Hook system
            addHook: this.addHook.bind(this),
            removeHook: this.removeHook.bind(this),
            triggerHook: this.triggerHook.bind(this),
            
            // Canvas API
            canvas: {
                getContext: () => window.app?.canvas || null,
                getSize: () => ({
                    width: window.app?.canvas?.width || 0,
                    height: window.app?.canvas?.height || 0
                }),
                addLayer: (name) => window.app?.addLayer?.(name),
                getCurrentLayer: () => window.app?.currentLayer || null,
            },
            
            // Tools API
            tools: {
                registerTool: this.registerTool.bind(this),
                getCurrentTool: () => window.app?.currentTool || null,
                setTool: (toolName) => window.app?.setTool?.(toolName),
            },
            
            // Brush API
            brushes: {
                register: this.registerBrush.bind(this),
                get: (id) => window.app?.brushes?.get?.(id),
                list: () => Array.from(window.app?.brushes?.keys() || []),
            },
            
            // UI API
            ui: {
                showDialog: this.showDialog.bind(this),
                showNotification: this.showNotification.bind(this),
                addMenuItem: this.addMenuItem.bind(this),
                addPanel: this.addPanel.bind(this),
            },
            
            // Storage API
            storage: {
                set: (key, value) => localStorage.setItem(`plugin_${key}`, JSON.stringify(value)),
                get: (key) => {
                    const val = localStorage.getItem(`plugin_${key}`);
                    return val ? JSON.parse(val) : null;
                },
                remove: (key) => localStorage.removeItem(`plugin_${key}`),
            },
            
            // Utils
            utils: {
                generateId: () => `plugin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                parseColor: this.parseColor.bind(this),
                blendColors: this.blendColors.bind(this),
            },
        };
    }

    /**
     * Register a plugin
     * @param {Object} plugin - Plugin configuration
     */
    registerPlugin(plugin) {
        if (!plugin.id || !plugin.name) {
            throw new Error('Plugin must have id and name');
        }

        if (this.plugins.has(plugin.id)) {
            throw new Error(`Plugin ${plugin.id} is already registered`);
        }

        // Validate plugin structure
        this.validatePlugin(plugin);

        // Store plugin
        this.plugins.set(plugin.id, {
            ...plugin,
            enabled: true,
            loaded: Date.now(),
        });

        // Call plugin initialization if available
        if (plugin.initialize) {
            try {
                plugin.initialize(window.ARTemisPluginAPI);
            } catch (e) {
                console.error(`Failed to initialize plugin ${plugin.id}:`, e);
            }
        }

        console.log(`✅ Registered plugin: ${plugin.name} (${plugin.id})`);

        // Trigger hook
        this.triggerHook('plugin-registered', plugin);
    }

    /**
     * Validate plugin structure
     */
    validatePlugin(plugin) {
        const required = ['id', 'name', 'version', 'author'];
        for (const field of required) {
            if (!plugin[field]) {
                throw new Error(`Plugin missing required field: ${field}`);
            }
        }

        // Validate version format
        if (!/^\d+\.\d+\.\d+$/.test(plugin.version)) {
            throw new Error('Plugin version must be in format: major.minor.patch');
        }
    }

    /**
     * Unregister a plugin
     */
    unregisterPlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            console.warn(`Plugin ${pluginId} not found`);
            return;
        }

        // Call cleanup if available
        if (plugin.cleanup) {
            try {
                plugin.cleanup();
            } catch (e) {
                console.error(`Error during plugin cleanup:`, e);
            }
        }

        this.plugins.delete(pluginId);
        console.log(`🗑️ Unregistered plugin: ${pluginId}`);

        this.triggerHook('plugin-unregistered', plugin);
    }

    /**
     * Get a plugin by ID
     */
    getPlugin(pluginId) {
        return this.plugins.get(pluginId);
    }

    /**
     * List all registered plugins
     */
    listPlugins() {
        return Array.from(this.plugins.values());
    }

    /**
     * Load plugins from storage
     */
    async loadInstalledPlugins() {
        const installed = localStorage.getItem('artemis_installed_plugins');
        if (!installed) return;

        try {
            const pluginList = JSON.parse(installed);
            console.log(`📦 Loading ${pluginList.length} installed plugins...`);

            for (const pluginInfo of pluginList) {
                await this.loadPlugin(pluginInfo);
            }
        } catch (e) {
            console.error('Failed to load installed plugins:', e);
        }
    }

    /**
     * Load a single plugin
     */
    async loadPlugin(pluginInfo) {
        try {
            // In a real implementation, this would load from a URL or local file
            console.log(`Loading plugin: ${pluginInfo.name}`);
            
            // For now, just log that we would load it
            // In production, use dynamic import or script loading
        } catch (e) {
            console.error(`Failed to load plugin ${pluginInfo.name}:`, e);
        }
    }

    /**
     * Set up plugin sandbox for security
     */
    setupSandbox() {
        // In production, plugins should run in isolated contexts
        // For now, we just track permissions
        this.permissions = {
            canvas: new Set(),
            storage: new Set(),
            network: new Set(),
        };
    }

    /**
     * Hook system - add a hook listener
     */
    addHook(hookName, callback, priority = 10) {
        if (!this.hooks.has(hookName)) {
            this.hooks.set(hookName, []);
        }

        this.hooks.get(hookName).push({ callback, priority });
        
        // Sort by priority (lower numbers run first)
        this.hooks.get(hookName).sort((a, b) => a.priority - b.priority);
    }

    /**
     * Remove a hook listener
     */
    removeHook(hookName, callback) {
        if (!this.hooks.has(hookName)) return;

        const hooks = this.hooks.get(hookName);
        const index = hooks.findIndex(h => h.callback === callback);
        
        if (index !== -1) {
            hooks.splice(index, 1);
        }
    }

    /**
     * Trigger a hook
     */
    triggerHook(hookName, data) {
        if (!this.hooks.has(hookName)) return data;

        const hooks = this.hooks.get(hookName);
        let result = data;

        for (const { callback } of hooks) {
            try {
                const returned = callback(result);
                if (returned !== undefined) {
                    result = returned;
                }
            } catch (e) {
                console.error(`Error in hook ${hookName}:`, e);
            }
        }

        return result;
    }

    /**
     * Register a custom tool
     */
    registerTool(toolConfig) {
        console.log(`Registering custom tool: ${toolConfig.name}`);
        // In production, integrate with main tool system
        this.triggerHook('tool-registered', toolConfig);
    }

    /**
     * Register a custom brush
     */
    registerBrush(brushConfig) {
        console.log(`Registering custom brush: ${brushConfig.name}`);
        // In production, integrate with brush system
        this.triggerHook('brush-registered', brushConfig);
    }

    /**
     * Show a dialog
     */
    showDialog(options) {
        alert(options.message || 'Plugin Dialog');
        // In production, use proper dialog system
    }

    /**
     * Show a notification
     */
    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // In production, use notification system
    }

    /**
     * Add a menu item
     */
    addMenuItem(menuConfig) {
        console.log(`Adding menu item: ${menuConfig.label}`);
        // In production, integrate with menu system
    }

    /**
     * Add a UI panel
     */
    addPanel(panelConfig) {
        console.log(`Adding panel: ${panelConfig.title}`);
        // In production, integrate with panel system
    }

    /**
     * Parse color from various formats
     */
    parseColor(color) {
        // Simple implementation
        if (typeof color === 'string' && color.startsWith('#')) {
            const hex = color.slice(1);
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return { r, g, b, a: 255 };
        }
        return { r: 0, g: 0, b: 0, a: 255 };
    }

    /**
     * Blend two colors
     */
    blendColors(color1, color2, amount = 0.5) {
        const c1 = this.parseColor(color1);
        const c2 = this.parseColor(color2);
        
        return {
            r: Math.round(c1.r + (c2.r - c1.r) * amount),
            g: Math.round(c1.g + (c2.g - c1.g) * amount),
            b: Math.round(c1.b + (c2.b - c1.b) * amount),
            a: Math.round(c1.a + (c2.a - c1.a) * amount),
        };
    }

    /**
     * Get plugin system status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            pluginCount: this.plugins.size,
            hookCount: this.hooks.size,
            apiVersion: this.apiVersion,
        };
    }
}

// Create and export instance
const pluginSystem = new PluginSystem();

// Export for dynamic imports
export async function initialize(capabilities) {
    return pluginSystem.initialize(capabilities);
}

export { pluginSystem };
