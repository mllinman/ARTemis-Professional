/**
 * ARTemis Professional - Features V3 Feature Flags System
 * 
 * This module manages the gradual rollout of V3 features (2026-2028 roadmap)
 * Features can be enabled/disabled globally or per-user for beta testing
 * 
 * @module v3-features/feature-flags
 */

class FeatureFlagsManager {
    constructor() {
        this.flags = this.loadFlags();
        this.callbacks = new Map();
    }

    /**
     * Load feature flags from localStorage or use defaults
     */
    loadFlags() {
        const stored = localStorage.getItem('artemis_v3_feature_flags');
        const defaults = this.getDefaultFlags();
        
        if (stored) {
            try {
                return { ...defaults, ...JSON.parse(stored) };
            } catch (e) {
                console.warn('Failed to parse stored feature flags, using defaults');
                return defaults;
            }
        }
        
        return defaults;
    }

    /**
     * Get default feature flags based on V3 roadmap timeline
     * Q1 2026 features are enabled for beta testing
     */
    getDefaultFlags() {
        return {
            // Pillar 1: AI-Native Creative Intelligence
            'ai-canvas-companion': false,           // Q1 2026 - Conversational AI assistant
            'ai-neural-generation': false,          // Q1 2026 - Text-to-image generation
            'ai-smart-layers': false,               // Q1 2026 - Auto subject detection
            'ai-quantum-upscaling': false,          // Q2 2026 - AI upscaling to 16K+
            'ai-content-aware-fill': false,         // Q2 2026 - Content-aware everything
            'ai-predictive-workflow': false,        // Q3 2026 - Smart composition assistant
            'ai-3d-from-2d': false,                 // Q4 2026 - Generate 3D from sketches
            
            // Pillar 2: Cloud-First Architecture
            'cloud-storage': false,                 // Q1 2026 - Universal cloud storage
            'cloud-rendering': false,               // Q1 2026 - Offload to cloud GPU
            'realtime-collaboration': false,        // Q2 2026 - Multi-user editing
            'cloud-asset-management': false,        // Q3 2026 - Cloud asset library
            'cross-platform-sync': false,           // Q4 2026 - Settings sync
            
            // Pillar 3: Performance Revolution
            'webgpu-rendering': false,              // Q1 2026 - WebGPU acceleration
            'tiled-rendering': false,               // Q1 2026 - 32K+ canvas support
            'adaptive-quality': false,              // Q1 2026 - Dynamic quality
            'compute-shaders': false,               // Q2 2026 - GPU compute for AI
            'multi-gpu-support': false,             // Q2 2026 - Multiple GPU usage
            'wasm-core': false,                     // Q3 2026 - WebAssembly rewrite
            
            // Pillar 4: Universal Accessibility
            'pwa-mode': false,                      // Q1 2026 - Progressive Web App
            'offline-mode': false,                  // Q1 2026 - Full offline support
            'mobile-app': false,                    // Q2 2026 - iOS/Android apps
            '3d-integration': false,                // Q2 2026 - 3D model painting
            'vr-ar-support': false,                 // Q4 2026 - VR/AR painting
            
            // Pillar 5: Open Ecosystem
            'plugin-marketplace': false,            // Q1 2026 - Buy/sell plugins
            'plugin-api': true,                     // Q1 2026 - Plugin system (enabled for dev)
            'creator-monetization': false,          // Q1 2026 - Revenue sharing
            'scripting-api': false,                 // Q2 2026 - JavaScript API
            'webhooks-api': false,                  // Q3 2026 - External integrations
            'blockchain-nft': false,                // Q2 2027 - NFT tools
            
            // Developer/Beta Features
            'v3-beta-access': false,                // Enable all beta features
            'v3-dev-mode': false,                   // Developer mode for testing
            'v3-feature-preview': false,            // Preview upcoming features
        };
    }

    /**
     * Check if a feature is enabled
     * @param {string} featureName - Name of the feature to check
     * @returns {boolean} True if feature is enabled
     */
    isEnabled(featureName) {
        // Beta access enables all features
        if (this.flags['v3-beta-access']) {
            return true;
        }
        
        return this.flags[featureName] === true;
    }

    /**
     * Enable a feature
     * @param {string} featureName - Name of feature to enable
     * @param {boolean} persist - Save to localStorage
     */
    enable(featureName, persist = true) {
        this.flags[featureName] = true;
        
        if (persist) {
            this.saveFlags();
        }
        
        this.notifyCallbacks(featureName, true);
    }

    /**
     * Disable a feature
     * @param {string} featureName - Name of feature to disable
     * @param {boolean} persist - Save to localStorage
     */
    disable(featureName, persist = true) {
        this.flags[featureName] = false;
        
        if (persist) {
            this.saveFlags();
        }
        
        this.notifyCallbacks(featureName, false);
    }

    /**
     * Toggle a feature on/off
     * @param {string} featureName - Name of feature to toggle
     * @param {boolean} persist - Save to localStorage
     */
    toggle(featureName, persist = true) {
        const newState = !this.flags[featureName];
        this.flags[featureName] = newState;
        
        if (persist) {
            this.saveFlags();
        }
        
        this.notifyCallbacks(featureName, newState);
        return newState;
    }

    /**
     * Get all enabled features
     * @returns {string[]} Array of enabled feature names
     */
    getEnabledFeatures() {
        return Object.keys(this.flags).filter(key => this.flags[key] === true);
    }

    /**
     * Get all features grouped by pillar
     * @returns {Object} Features organized by pillar
     */
    getFeaturesByPillar() {
        const enabled = this.getEnabledFeatures();
        return {
            ai: enabled.filter(f => f.startsWith('ai-')),
            cloud: enabled.filter(f => f.startsWith('cloud-') || f === 'realtime-collaboration'),
            performance: enabled.filter(f => f.startsWith('webgpu-') || f.startsWith('wasm-') || 
                                            f.includes('rendering') || f.includes('gpu')),
            platform: enabled.filter(f => f.includes('mobile') || f.includes('pwa') || 
                                        f.includes('vr') || f.includes('3d')),
            ecosystem: enabled.filter(f => f.startsWith('plugin-') || f.includes('api') || 
                                          f.includes('webhook') || f.includes('blockchain')),
        };
    }

    /**
     * Register a callback for feature state changes
     * @param {string} featureName - Feature to watch
     * @param {Function} callback - Function to call on change
     */
    onChange(featureName, callback) {
        if (!this.callbacks.has(featureName)) {
            this.callbacks.set(featureName, []);
        }
        this.callbacks.get(featureName).push(callback);
    }

    /**
     * Notify registered callbacks of state change
     * @param {string} featureName - Feature that changed
     * @param {boolean} newState - New state of feature
     */
    notifyCallbacks(featureName, newState) {
        const callbacks = this.callbacks.get(featureName);
        if (callbacks) {
            callbacks.forEach(cb => {
                try {
                    cb(newState, featureName);
                } catch (e) {
                    console.error(`Error in feature flag callback for ${featureName}:`, e);
                }
            });
        }
    }

    /**
     * Save flags to localStorage
     */
    saveFlags() {
        try {
            localStorage.setItem('artemis_v3_feature_flags', JSON.stringify(this.flags));
        } catch (e) {
            console.error('Failed to save feature flags:', e);
        }
    }

    /**
     * Reset all flags to defaults
     */
    reset() {
        this.flags = this.getDefaultFlags();
        this.saveFlags();
    }

    /**
     * Enable beta access (turns on all features)
     */
    enableBetaAccess() {
        this.enable('v3-beta-access');
    }

    /**
     * Check if user has beta access
     * @returns {boolean} True if beta access is enabled
     */
    hasBetaAccess() {
        return this.isEnabled('v3-beta-access');
    }

    /**
     * Get feature status for debugging
     * @returns {Object} All flags and their states
     */
    getDebugInfo() {
        return {
            flags: this.flags,
            enabled: this.getEnabledFeatures(),
            byPillar: this.getFeaturesByPillar(),
            betaAccess: this.hasBetaAccess(),
        };
    }
}

// Create global instance
const featureFlags = new FeatureFlagsManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { featureFlags, FeatureFlagsManager };
}
