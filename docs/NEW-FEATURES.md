# ARTemis New Features Documentation

This document describes the newly implemented features in ARTemis, including gradient tool, transform tools, filters, blend modes, adjustment layers, custom brush tips, brush preset system, and plugin architecture.

## 🎨 Gradient Tool

The gradient tool allows you to create beautiful linear and radial gradients on your canvas.

### Features
- **Linear Gradient**: Creates a gradient along a straight line from start to end point
- **Radial Gradient**: Creates a circular gradient radiating from the start point
- **Color Selection**: Choose start and end colors using the color pickers
- **Opacity Control**: Use the opacity slider to control gradient transparency

### Usage
1. Select the Gradient tool from the toolbar or press `L`
2. Choose gradient type (Linear or Radial) from the left panel
3. Select your start color with the main color picker
4. Select your end color with the secondary color picker (Gradient Color 2)
5. Click and drag on the canvas to define the gradient direction/radius
6. Release to apply the gradient

### Keyboard Shortcut
- `L` - Activate gradient tool

---

## 🔄 Transform Tools

Transform tools allow you to manipulate layer content with move, rotate, and scale operations.

### Move Tool
Reposition the content of the active layer.

**Usage:**
1. Select the Move tool from toolbar or press `V`
2. Click and drag to move the layer content
3. Release to apply the transformation

**Keyboard Shortcut:** `V`

### Rotate Tool
Rotate the active layer content around its center point.

**Usage:**
1. Select the Rotate tool from toolbar or press `R`
2. Click and drag to rotate the layer
3. Drag away from center to rotate clockwise/counterclockwise
4. Release to apply the rotation

**Keyboard Shortcut:** `R`

### Scale Tool
Resize the active layer content.

**Usage:**
1. Select the Scale tool from toolbar or press `Z`
2. Click and drag up to scale up, down to scale down
3. Release to apply the scaling

**Keyboard Shortcut:** `Z`

### Important Notes
- Transform operations are applied to the active layer only
- Transformations are destructive once applied
- Use Undo (Ctrl+Z) if you need to revert changes

---

## ✨ Filters and Effects

Professional image processing filters for enhancing your artwork.

### Available Filters

#### Brightness
Adjusts the brightness of the active layer.
- **Range**: -100 to +100
- **Usage**: Filters menu > Brightness/Contrast, or use filter button in left panel
- **Interactive**: Enter value when prompted

#### Contrast
Adjusts the contrast of the active layer.
- **Range**: -100 to +100
- **Usage**: Same as brightness
- **Effect**: Increases difference between light and dark areas

#### Blur
Applies a box blur effect to soften the image.
- **Radius**: 1-10 pixels
- **Usage**: Filters menu > Blur, or use filter button
- **Effect**: Softens details and reduces noise

#### Sharpen
Enhances edges and details in the image.
- **Usage**: Filters menu > Sharpen, or use filter button
- **Effect**: Uses convolution kernel to emphasize edges

#### Grayscale
Converts the image to grayscale.
- **Usage**: Filters menu > Grayscale, or use filter button
- **Effect**: Removes color while preserving luminance

#### Invert
Inverts all colors in the image.
- **Usage**: Filters menu > Invert, or use filter button
- **Effect**: Creates a negative of the image

### Applying Filters
1. Select the layer you want to filter
2. Click a filter button in the left panel, or use the Filters menu
3. Enter parameters if prompted
4. The filter is applied immediately to the active layer
5. Use Undo to revert if needed

---

## 🎭 Blend Modes

Blend modes control how layers composite with layers below them.

### Available Blend Modes
- **Normal**: Default blending, no special effect
- **Multiply**: Darkens by multiplying colors
- **Screen**: Lightens by inverting, multiplying, and inverting again
- **Overlay**: Combines Multiply and Screen based on luminance
- **Darken**: Selects darker of base or blend color
- **Lighten**: Selects lighter of base or blend color
- **Color Dodge**: Brightens base color
- **Color Burn**: Darkens base color
- **Hard Light**: Similar to Overlay but more intense
- **Soft Light**: Similar to Overlay but softer
- **Difference**: Subtracts darker from lighter
- **Exclusion**: Similar to Difference but lower contrast

### Using Blend Modes
1. Select a layer in the Layers panel
2. Choose a blend mode from the "Blend Mode" dropdown in the layers panel
3. The layer will immediately composite using the selected mode
4. Experiment with different modes to achieve desired effects

### Tips
- Multiply is great for shadows and darkening
- Screen is excellent for highlights and lightening
- Overlay provides good contrast enhancement
- Experiment with opacity + blend mode combinations

---

## ⚙️ Adjustment Layers

Non-destructive color and tone adjustments that affect all layers below.

### Features
- **Non-destructive**: Adjustments don't modify original pixels
- **Stackable**: Multiple adjustment layers can be combined
- **Editable**: Modify adjustment settings anytime
- **Layer-based**: Uses the layer system for flexibility

### Creating Adjustment Layers
1. In the Layers panel header, select "⚙️ Adjust" from the layer type dropdown
2. Click the "+" button to create a new adjustment layer
3. The adjustment layer appears in the layers list

### Adjustment Settings
Currently supported adjustments:
- **Brightness**: Adjust overall brightness (-100 to +100)
- **Saturation**: Control color intensity

### Usage Tips
- Place adjustment layers above the layers you want to affect
- All visible layers below the adjustment layer are affected
- Use layer opacity to reduce adjustment intensity
- Combine with blend modes for creative effects
- Toggle visibility to preview before/after

---

## 🖌️ Custom Brush Tips

Create unique brush effects with custom shapes and textures.

### Brush Tip Shapes

#### Circle (Default)
- Classic round brush with soft edges
- Controlled by hardness setting
- Best for general painting

#### Square
- Square-shaped brush tip
- Creates blocky, geometric strokes
- Good for pixel art style

#### Star
- 5-pointed star shape
- Creates unique decorative effects
- Fun for special effects

#### Custom Texture
- Load your own image as a brush tip
- Any PNG/JPG image can be used
- Great for creating unique stamps and textures

### Using Custom Brush Tips
1. Open the "Brush Tip" section in the left panel
2. Select a shape from the "Shape" dropdown
3. For custom textures:
   - Select "Custom" from the dropdown
   - Click "Load Texture" button
   - Choose an image file (PNG/JPG)
   - The image becomes your brush tip

### Tips
- Custom textures work best with high-contrast images
- Smaller textures (256x256) perform better
- Combine tip shapes with other brush settings for variety
- Use scatter and rotation for organic effects with custom tips

---

## 💾 Brush Preset Save/Load System

Save and share your favorite brush configurations.

### Features
- **Save Presets**: Save current brush settings as named presets
- **LocalStorage**: Presets persist across sessions
- **Import/Export**: Share brushes with others or backup
- **JSON Format**: Simple, readable preset format

### Saving a Brush Preset
1. Configure your brush with desired settings (size, hardness, flow, etc.)
2. Open the "Custom Brushes" section in the left panel
3. Click "Save Preset" button
4. Enter a name for your preset
5. The preset is saved to your custom brushes list

### Exporting Brushes
1. Click "Export" button in the Custom Brushes section
2. A JSON file will be downloaded with all your custom brushes
3. Share this file with others or keep as backup

### Importing Brushes
1. Click "Import" button in the Custom Brushes section
2. Select a brush presets JSON file
3. Brushes are added to your collection
4. Duplicate names will be added as separate presets

### Preset Data
Each preset includes:
- Size, opacity, hardness
- Flow and spacing
- Smoothing mode and level
- Angle and angle jitter
- Scatter X and Y
- Brush tip shape

---

## 🔌 Plugin System

Extend ARTemis functionality with custom plugins.

### Plugin Architecture
The plugin system provides a safe, isolated API for extending ARTemis without modifying core code.

### Plugin API

#### Available Functions
```javascript
api.getState()              // Get current application state
api.getActiveLayer()        // Get active layer object
api.getLayers()            // Get all layers array
api.addLayer(name, type)   // Create a new layer
api.applyFilter(type, opts) // Apply filter to active layer
api.getCanvas()            // Get main canvas element
api.getContext()           // Get main canvas context
api.saveState()            // Save to undo history
api.compositeAllLayers()   // Refresh canvas display
```

#### Registration Functions
```javascript
api.registerTool(name, handler)     // Register custom tool
api.registerFilter(name, function)  // Register custom filter
api.registerMenuItem(path, handler) // Add menu item
```

### Creating a Plugin

#### Example: Custom Filter Plugin
```javascript
const myFilterPlugin = `
    // Register a custom sepia filter
    api.registerFilter('sepia', (imageData, options) => {
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
            data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
            data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
        }
        return imageData;
    });
`;

// Load the plugin
loadPlugin(myFilterPlugin);
```

#### Example: Custom Tool Plugin
```javascript
const customToolPlugin = `
    api.registerTool('myTool', {
        onStart: (x, y) => {
            // Called when tool is activated and mouse pressed
            console.log('Tool started at', x, y);
        },
        onMove: (x, y) => {
            // Called during mouse movement
            console.log('Tool moved to', x, y);
        },
        onEnd: () => {
            // Called when mouse released
            console.log('Tool ended');
            api.saveState();
        }
    });
`;

loadPlugin(customToolPlugin);
```

### Plugin Management Functions
```javascript
loadPlugin(code)        // Load a plugin from JavaScript code string
unloadPlugin(name)      // Remove a plugin by name
listPlugins()          // Get list of loaded plugins
```

### Security Considerations
- Plugins run in a Function scope, not global scope
- Plugins don't have access to Node.js/Electron APIs
- Plugin API is limited to safe operations
- Always review plugin code before loading
- Only load plugins from trusted sources

### Future Plugin Capabilities
The plugin system is designed to be extended with:
- Custom UI panels
- Keyboard shortcut registration
- Event listeners
- File format support
- Network capabilities (with permissions)

---

## 🎯 Workflow Tips

### Combining Features
1. **Non-destructive Workflow**
   - Use adjustment layers for color corrections
   - Keep original layers intact
   - Apply filters to duplicate layers

2. **Creative Effects**
   - Stack multiple adjustment layers
   - Use blend modes with custom brushes
   - Combine filters for unique looks

3. **Efficient Painting**
   - Save your favorite brush configurations
   - Use keyboard shortcuts for tool switching
   - Create custom brushes for repeated elements

4. **Transform Workflow**
   - Duplicate layer before transforming
   - Use Undo to experiment freely
   - Combine transforms for complex adjustments

### Performance Tips
- Filters on large canvases may take time
- Blur radius affects performance exponentially
- Custom brush textures should be reasonably sized
- Transform operations are memory-intensive

---

## 📚 Additional Resources

- **[README.md](README.md)** - Main documentation and overview
- **[BRUSH-ENGINE.md](BRUSH-ENGINE.md)** - Detailed brush system documentation
- **[USAGE.md](USAGE.md)** - General usage guide
- **[FUTURE_ENHANCEMENTS.md](FUTURE_ENHANCEMENTS.md)** - Planned features roadmap

---

## 🐛 Known Limitations

1. **Transform Tools**: Transformations are destructive once applied
2. **Filters**: No preview mode (applied immediately)
3. **Adjustment Layers**: Limited to brightness and saturation currently
4. **Blend Modes**: Use CSS composite operations (browser-dependent rendering)
5. **Custom Brushes**: Limited to 50 presets in localStorage
6. **Plugin System**: No UI for plugin management yet

---

## 💡 Feature Requests

Have ideas for improving these features? Please open an issue on GitHub!

Future enhancements planned:
- Filter preview before applying
- More adjustment layer types (curves, levels, hue/saturation)
- Real-time transform handles
- Plugin marketplace
- More blend mode algorithms
- Brush tip editor

---

**Version**: 1.0.0  
**Last Updated**: October 2024  
**Author**: ARTemis Development Team
