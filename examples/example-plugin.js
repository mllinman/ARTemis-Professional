/**
 * Example ARTemis V3 Plugin
 * 
 * This is a simple example plugin demonstrating the V3 Plugin API.
 * To use this plugin, load it after the main application is ready.
 * 
 * Usage:
 * 1. Copy this file to your plugins directory
 * 2. Load with: <script src="examples/example-plugin.js"></script>
 * 3. Or dynamically: import('./examples/example-plugin.js')
 */

// Wait for ARTemis Plugin API to be ready
if (typeof ARTemisPluginAPI !== 'undefined') {
    initPlugin();
} else {
    window.addEventListener('v3-features-ready', initPlugin);
}

function initPlugin() {
    // Register the plugin
    ARTemisPluginAPI.registerPlugin({
        // Required fields
        id: 'example-plugin',
        name: 'Example Plugin',
        version: '1.0.0',
        author: 'ARTemis Team',
        
        // Optional fields
        description: 'A simple example plugin demonstrating V3 Plugin API features',
        homepage: 'https://github.com/mllinman/ARTemis-Professional',
        
        // Initialization function called when plugin loads
        initialize: function(api) {
            console.log('🎨 Example Plugin initialized!');
            
            // Show a welcome notification
            api.ui.showNotification('Example Plugin loaded successfully!', 'success');
            
            // Store some plugin data
            api.storage.set('examplePlugin.firstLoad', new Date().toISOString());
            
            console.log('✅ Example Plugin features activated');
        },
        
        // Cleanup function called when plugin unloads
        cleanup: function() {
            console.log('🗑️ Example Plugin cleanup');
        }
    });
    
    console.log('🔌 Example Plugin registered successfully');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initPlugin };
}
