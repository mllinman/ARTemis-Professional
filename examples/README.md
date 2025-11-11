# ARTemis V3 Plugin Examples

This directory contains example plugins demonstrating the V3 Plugin API.

## Available Examples

### example-plugin.js
A simple example plugin showing basic Plugin API features:
- Plugin registration
- Hook system
- Storage API
- UI integration

## Usage

### Option 1: Load in HTML
```html
<script src="examples/example-plugin.js"></script>
```

### Option 2: Dynamic Import
```javascript
import('./examples/example-plugin.js');
```

### Option 3: Manual Registration
```javascript
ARTemisPluginAPI.registerPlugin({
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    author: 'Your Name',
    initialize: (api) => {
        api.ui.showNotification('Plugin loaded!');
    }
});
```

## Creating Your Own Plugin

1. Create a new JavaScript file
2. Register your plugin with `ARTemisPluginAPI.registerPlugin()`
3. Use the API to add features:
   - `api.canvas` - Canvas operations
   - `api.tools` - Tool registration
   - `api.brushes` - Brush registration
   - `api.ui` - UI elements
   - `api.storage` - Data persistence
   - `api.addHook()` - Hook into events

## Documentation

See [V3 Features README](../src/v3-features/README.md) for complete API documentation.

## Support

For questions or issues, see the main [README](../README.md).
