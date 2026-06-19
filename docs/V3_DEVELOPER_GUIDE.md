# ARTemis V3 Developer Guide

Quick reference for developers working with ARTemis V3 features.

## Quick Start

### 1. Enable V3 Features

```javascript
// Enable beta access (all features)
featureFlags.enableBetaAccess();

// Or enable specific features
featureFlags.enable('plugin-api');
featureFlags.enable('pwa-mode');
featureFlags.enable('webgpu-rendering');
```

### 2. Check Feature Availability

```javascript
// Check if feature is enabled
if (featureFlags.isEnabled('plugin-api')) {
    // Use plugin API
}

// Get all enabled features
const enabled = featureFlags.getEnabledFeatures();

// Watch for feature changes
featureFlags.onChange('webgpu-rendering', (enabled) => {
    if (enabled) {
        initWebGPU();
    }
});
```

### 3. Create a Plugin

```javascript
ARTemisPluginAPI.registerPlugin({
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    author: 'Your Name',
    
    initialize: function(api) {
        // Plugin initialization
        api.ui.showNotification('Plugin loaded!');
        
        // Add hooks
        api.addHook('before-stroke', (data) => {
            // Modify stroke behavior
            return data;
        });
        
        // Access canvas
        const ctx = api.canvas.getContext();
        const size = api.canvas.getSize();
        
        // Store data
        api.storage.set('myData', { value: 123 });
    },
    
    cleanup: function() {
        // Cleanup when plugin unloads
    }
});
```

## API Reference

### Feature Flags API

```javascript
// Enable/disable features
featureFlags.enable('feature-name');
featureFlags.disable('feature-name');
featureFlags.toggle('feature-name');

// Query features
featureFlags.isEnabled('feature-name');
featureFlags.getEnabledFeatures();
featureFlags.getFeaturesByPillar();

// Beta access
featureFlags.enableBetaAccess();
featureFlags.hasBetaAccess();

// Callbacks
featureFlags.onChange('feature-name', callback);
```

### Plugin API

```javascript
// Registration
ARTemisPluginAPI.registerPlugin(config);
ARTemisPluginAPI.unregisterPlugin(id);
ARTemisPluginAPI.getPlugin(id);
ARTemisPluginAPI.listPlugins();

// Hooks
ARTemisPluginAPI.addHook(name, callback, priority);
ARTemisPluginAPI.removeHook(name, callback);
ARTemisPluginAPI.triggerHook(name, data);

// Canvas
ARTemisPluginAPI.canvas.getContext();
ARTemisPluginAPI.canvas.getSize();
ARTemisPluginAPI.canvas.addLayer(name);
ARTemisPluginAPI.canvas.getCurrentLayer();

// Tools
ARTemisPluginAPI.tools.registerTool(config);
ARTemisPluginAPI.tools.getCurrentTool();
ARTemisPluginAPI.tools.setTool(name);

// Brushes
ARTemisPluginAPI.brushes.register(config);
ARTemisPluginAPI.brushes.get(id);
ARTemisPluginAPI.brushes.list();

// UI
ARTemisPluginAPI.ui.showDialog(options);
ARTemisPluginAPI.ui.showNotification(message, type);
ARTemisPluginAPI.ui.addMenuItem(config);
ARTemisPluginAPI.ui.addPanel(config);

// Storage
ARTemisPluginAPI.storage.set(key, value);
ARTemisPluginAPI.storage.get(key);
ARTemisPluginAPI.storage.remove(key);

// Utils
ARTemisPluginAPI.utils.generateId();
ARTemisPluginAPI.utils.parseColor(color);
ARTemisPluginAPI.utils.blendColors(c1, c2, amount);
```

### Configuration API

```javascript
// Get config values
const value = V3Config.get('api.base');
const tiers = V3Config.get('tiers');

// Check feature availability by tier
const available = V3Config.isFeatureAvailable('plugin-api', 'pro');

// Get release timeline
const releaseDate = V3Config.getFeatureReleaseDate('ai-canvas-companion');

// Check browser compatibility
const compatible = V3Config.isBrowserCompatible('webgpu');
```

### V3 Status API

```javascript
// Get V3 status
const status = v3Features.getStatus();
// Returns:
// {
//   initialized: boolean,
//   capabilities: {...},
//   userTier: string,
//   enabledFeatures: string[],
//   loadedModules: string[]
// }

// Get capabilities
const caps = v3Features.capabilities;
// Returns detected browser capabilities
```

## Available Hooks

Plugins can hook into these events:

- `plugin-registered` - When a plugin is registered
- `plugin-unregistered` - When a plugin is unregistered
- `tool-registered` - When a custom tool is registered
- `brush-registered` - When a custom brush is registered
- `before-stroke` - Before a brush stroke starts
- `after-stroke` - After a brush stroke completes
- `layer-added` - When a layer is added
- `layer-removed` - When a layer is removed
- More hooks can be added as needed

## Feature Flags by Pillar

### AI Features (Pillar 1)
- `ai-canvas-companion`
- `ai-neural-generation`
- `ai-smart-layers`
- `ai-quantum-upscaling`
- `ai-content-aware-fill`
- `ai-predictive-workflow`
- `ai-3d-from-2d`

### Cloud Features (Pillar 2)
- `cloud-storage`
- `cloud-rendering`
- `realtime-collaboration`
- `cloud-asset-management`
- `cross-platform-sync`

### Performance Features (Pillar 3)
- `webgpu-rendering`
- `tiled-rendering`
- `adaptive-quality`
- `compute-shaders`
- `multi-gpu-support`
- `wasm-core`

### Platform Features (Pillar 4)
- `pwa-mode` ✅
- `offline-mode`
- `mobile-app`
- `3d-integration`
- `vr-ar-support`

### Ecosystem Features (Pillar 5)
- `plugin-marketplace`
- `plugin-api` ✅
- `creator-monetization`
- `scripting-api`
- `webhooks-api`
- `blockchain-nft`

## Testing

### Test Page
Open `test-v3-features.html` in your browser to test V3 features.

### Manual Testing
```javascript
// Enable debug mode
featureFlags.enable('v3-dev-mode');

// Get debug info
console.log(featureFlags.getDebugInfo());
console.log(v3Features.getStatus());

// Test plugin registration
ARTemisPluginAPI.registerPlugin({
    id: 'test',
    name: 'Test',
    version: '1.0.0',
    author: 'Test',
    initialize: () => console.log('Test plugin loaded')
});
```

## Examples

See `examples/` directory for:
- `example-plugin.js` - Complete plugin example
- `README.md` - Plugin development guide

## Documentation

- [FEATURES_V3.md](FEATURES_V3.md) - Complete roadmap
- [FEATURES_V3_IMPLEMENTATION.md](FEATURES_V3_IMPLEMENTATION.md) - Implementation details
- [src/v3-features/README.md](src/v3-features/README.md) - Technical documentation

## Support

For issues or questions:
1. Check console for errors
2. Enable debug mode
3. Review documentation
4. Open GitHub issue

## Contributing

1. Pick a feature from the roadmap
2. Create module in appropriate pillar directory
3. Add feature flag
4. Update configuration
5. Test thoroughly
6. Document API changes
7. Submit pull request

---

**Ready to build the future of digital art!** 🎨✨
