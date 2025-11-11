/**
 * ARTemis Professional - Features V3 Configuration
 * 
 * Central configuration for V3 features including API endpoints,
 * feature settings, and compatibility information
 * 
 * @module v3-features/v3-config
 */

const V3Config = {
    // Version information
    version: {
        major: 3,
        minor: 0,
        patch: 0,
        beta: true,
        buildDate: '2026-01-01',
        codename: 'Phoenix',
    },

    // API endpoints for cloud services
    api: {
        base: 'https://api.artemis.app/v3',
        cloud: {
            storage: '/cloud/storage',
            rendering: '/cloud/render',
            sync: '/cloud/sync',
        },
        ai: {
            generation: '/ai/generate',
            upscaling: '/ai/upscale',
            enhancement: '/ai/enhance',
        },
        marketplace: {
            plugins: '/marketplace/plugins',
            assets: '/marketplace/assets',
            purchase: '/marketplace/purchase',
        },
        collaboration: {
            rooms: '/collab/rooms',
            websocket: 'wss://collab.artemis.app/v3',
        },
    },

    // Feature availability based on subscription tier
    tiers: {
        free: {
            name: 'Free',
            features: [
                'plugin-api',
                'offline-mode',
                'pwa-mode',
            ],
            limits: {
                cloudStorageGB: 1,
                aiGenerationsPerDay: 10,
                collaborators: 1,
                plugins: 5,
            },
        },
        pro: {
            name: 'Pro',
            price: 9.99,
            features: [
                'plugin-api',
                'offline-mode',
                'pwa-mode',
                'cloud-storage',
                'cloud-rendering',
                'ai-canvas-companion',
                'ai-neural-generation',
                'tiled-rendering',
                'webgpu-rendering',
            ],
            limits: {
                cloudStorageGB: 100,
                aiGenerationsPerDay: 1000,
                collaborators: 10,
                plugins: -1, // unlimited
            },
        },
        team: {
            name: 'Team',
            price: 19.99,
            features: [
                'plugin-api',
                'offline-mode',
                'pwa-mode',
                'cloud-storage',
                'cloud-rendering',
                'realtime-collaboration',
                'cloud-asset-management',
                'ai-canvas-companion',
                'ai-neural-generation',
                'ai-quantum-upscaling',
                'tiled-rendering',
                'webgpu-rendering',
            ],
            limits: {
                cloudStorageGB: 1000,
                aiGenerationsPerDay: 10000,
                collaborators: -1, // unlimited
                plugins: -1,
            },
        },
        enterprise: {
            name: 'Enterprise',
            price: 99.99,
            features: 'all', // All features enabled
            limits: {
                cloudStorageGB: -1, // unlimited
                aiGenerationsPerDay: -1,
                collaborators: -1,
                plugins: -1,
            },
        },
    },

    // Browser and platform compatibility
    compatibility: {
        browsers: {
            chrome: { min: 113, webgpu: true },
            edge: { min: 113, webgpu: true },
            firefox: { min: 120, webgpu: true },
            safari: { min: 17, webgpu: true },
        },
        features: {
            webgpu: {
                required: ['chrome', 'edge'],
                optional: ['firefox', 'safari'],
                fallback: 'webgl2',
            },
            wasm: {
                required: 'all',
                threads: true,
                simd: true,
            },
            pwa: {
                required: ['chrome', 'edge', 'safari'],
                serviceWorker: true,
                manifest: true,
            },
        },
    },

    // Performance targets
    performance: {
        brushLatency: {
            target: 1, // ms
            acceptable: 10,
            warning: 16,
        },
        fps: {
            target: 240,
            acceptable: 60,
            minimum: 30,
        },
        canvasSize: {
            max: 32768, // 32K support
            tiles: 512, // tile size
            virtualMemory: true,
        },
        memory: {
            maxUsageMB: 2048,
            warningThreshold: 0.8,
            gcInterval: 60000, // ms
        },
    },

    // Plugin system configuration
    plugins: {
        api: {
            version: '3.0.0',
            compatibleVersions: ['3.0.x'],
        },
        sandbox: {
            enabled: true,
            permissions: {
                canvas: true,
                storage: 'prompt',
                network: 'prompt',
                filesystem: false,
            },
        },
        marketplace: {
            commission: 0.30, // 70/30 split
            minimumPrice: 0.99,
            maximumPrice: 999.99,
        },
    },

    // AI feature configuration
    ai: {
        models: {
            generation: {
                default: 'artemis-diffusion-v1',
                available: [
                    'artemis-diffusion-v1',
                    'stable-diffusion-xl',
                    'dall-e-3',
                ],
            },
            upscaling: {
                default: 'artemis-upscale-v1',
                maxScale: 16,
            },
        },
        safety: {
            contentFiltering: true,
            nsfwDetection: true,
            copyrightCheck: true,
        },
        attribution: {
            required: true,
            watermark: false,
        },
    },

    // Cloud configuration
    cloud: {
        autoSave: {
            enabled: true,
            intervalSeconds: 300, // 5 minutes
            maxVersions: 100,
        },
        sync: {
            enabled: true,
            realtime: false,
            conflictResolution: 'manual',
        },
        rendering: {
            enabled: true,
            priority: 'normal', // free, normal, high, realtime
            timeout: 300, // seconds
        },
    },

    // Collaboration settings
    collaboration: {
        maxConcurrentUsers: 10,
        cursorUpdateRate: 60, // Hz
        layerLocking: true,
        changeTracking: true,
        voiceChat: false, // Premium feature
        videoChat: false, // Premium feature
    },

    // Development and debug settings
    debug: {
        enabled: false,
        logging: {
            level: 'info', // debug, info, warn, error
            console: true,
            remote: false,
        },
        performance: {
            showFPS: false,
            showMemory: false,
            profiling: false,
        },
        experimental: {
            enabled: false,
            features: [],
        },
    },

    // Feature rollout schedule (based on FEATURES_V3.md)
    roadmap: {
        '2026-Q1': [
            'ai-canvas-companion',
            'ai-neural-generation',
            'ai-smart-layers',
            'cloud-storage',
            'cloud-rendering',
            'webgpu-rendering',
            'tiled-rendering',
            'adaptive-quality',
            'pwa-mode',
            'offline-mode',
            'plugin-marketplace',
            'plugin-api',
            'creator-monetization',
        ],
        '2026-Q2': [
            'ai-quantum-upscaling',
            'ai-content-aware-fill',
            'realtime-collaboration',
            'compute-shaders',
            'multi-gpu-support',
            'mobile-app',
            '3d-integration',
            'scripting-api',
        ],
        '2026-Q3': [
            'ai-predictive-workflow',
            'cloud-asset-management',
            'wasm-core',
            'webhooks-api',
        ],
        '2026-Q4': [
            'ai-3d-from-2d',
            'cross-platform-sync',
            'vr-ar-support',
        ],
        '2027-Q2': [
            'blockchain-nft',
        ],
    },
};

/**
 * Get configuration for a specific feature
 * @param {string} path - Dot-notation path to config value
 * @returns {*} Configuration value
 */
V3Config.get = function(path) {
    const parts = path.split('.');
    let current = this;
    
    for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
            current = current[part];
        } else {
            return undefined;
        }
    }
    
    return current;
};

/**
 * Check if a feature is available in current tier
 * @param {string} feature - Feature name
 * @param {string} tier - Subscription tier
 * @returns {boolean} True if available
 */
V3Config.isFeatureAvailable = function(feature, tier = 'free') {
    const tierConfig = this.tiers[tier];
    if (!tierConfig) return false;
    
    if (tierConfig.features === 'all') return true;
    
    return tierConfig.features.includes(feature);
};

/**
 * Get the quarter when a feature is scheduled for release
 * @param {string} feature - Feature name
 * @returns {string|null} Quarter string or null
 */
V3Config.getFeatureReleaseDate = function(feature) {
    for (const [quarter, features] of Object.entries(this.roadmap)) {
        if (features.includes(feature)) {
            return quarter;
        }
    }
    return null;
};

/**
 * Check browser compatibility for a feature
 * @param {string} feature - Feature name to check
 * @returns {boolean} True if browser supports feature
 */
V3Config.isBrowserCompatible = function(feature) {
    const featureConfig = this.compatibility.features[feature];
    if (!featureConfig) return true; // Assume compatible if not specified
    
    // Basic browser detection (simplified)
    const userAgent = navigator.userAgent.toLowerCase();
    let browser = 'chrome';
    
    if (userAgent.includes('firefox')) browser = 'firefox';
    else if (userAgent.includes('safari') && !userAgent.includes('chrome')) browser = 'safari';
    else if (userAgent.includes('edg')) browser = 'edge';
    
    const required = featureConfig.required;
    if (required === 'all') return true;
    if (Array.isArray(required)) return required.includes(browser);
    
    return true;
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { V3Config };
}
