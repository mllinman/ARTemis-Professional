# ARTemis Usage Guide

## Getting Started

1. **Launch the Application**
   ```bash
   npm start
   ```

2. **Create Your First Drawing**
   - The application opens with a white 800x600 canvas
   - Select the Brush tool (already selected by default)
   - Choose a color using the color picker or swatches
   - Start drawing on the canvas!

## Interface Overview

### Top Toolbar
The top toolbar contains all the primary tools:
- **Brush** - For painting and drawing
- **Eraser** - For removing content
- **Fill** - For filling areas with color
- **Eyedropper** - For picking colors from the canvas
- **Selection** - For selecting regions (framework ready)
- **Undo/Redo** - For reversing or reapplying actions

### Left Panel - Tool Settings
The left panel shows settings for the active tool:
- **Size** - Adjust brush/eraser size (1-200px)
- **Opacity** - Control transparency (1-100%)
- **Hardness** - Set edge softness (0-100%)
- **Pressure Options** - Toggle pressure sensitivity for size and opacity
- **Color Picker** - Select painting color
- **Color Swatches** - Quick access to common colors

### Canvas Area
The central area is your painting canvas:
- **White Background** - Your drawing surface
- **Checkered Pattern** - Indicates transparent areas (behind canvas)
- **Info Bar** - Bottom bar shows zoom level, canvas size, and cursor position

### Right Panel - Layers
The right panel manages your layers:
- **Layers List** - Shows all layers with thumbnails
- **Active Layer** - Highlighted in blue
- **Visibility Toggle** - Eye icon to show/hide layers
- **New Layer** - Plus button in header
- **Duplicate Layer** - Copy icon in footer
- **Delete Layer** - Trash icon in footer

## Basic Workflows

### Drawing and Painting
1. Select the Brush tool (B key)
2. Adjust size, opacity, and hardness as desired
3. Choose a color
4. Draw on the canvas using your mouse or pen tablet
5. For pressure-sensitive devices, pen pressure affects size and opacity

### Working with Layers
1. Click "+" in Layers panel to add a new layer
2. Select layer type from dropdown (Paint, Vector, Filter, Group, or File) ⭐ NEW
3. Click on a layer to make it active
4. Draw only affects the active layer
5. Toggle layer visibility with the eye icon
6. Use move up/down buttons to reorder layers ⭐ NEW
7. Duplicate layers to create variations
8. Delete layers you no longer need (keep at least one layer)
9. Flatten all visible layers into one (Ctrl/Cmd+Shift+E) ⭐ NEW

### Saving Your Work
1. **Save Project** (Ctrl/Cmd+S)
   - Saves in .artemis format with all layers
   - Can be reopened later for continued editing
   
2. **Export Image** (Ctrl/Cmd+E)
   - Exports as PNG or JPEG
   - Flattens all visible layers
   - For sharing or publishing

### Loading Projects
1. **Open Project** (Ctrl/Cmd+O)
   - Opens .artemis files
   - Restores all layers and settings
   - Ready to continue working

## Tips and Tricks

### Brush Control
- Use `[` and `]` keys to quickly decrease/increase brush size
- Enable pressure sensitivity for natural painting feel
- Reduce hardness for softer, more blended strokes
- Lower opacity for transparent effects and gradual building

### Navigation
- Use **Ctrl/Cmd + Mouse Wheel** to zoom in/out
- Use **Middle Mouse Button** or **Ctrl + Left Mouse** to pan around
- Press **Ctrl/Cmd + 0** to reset zoom to 100%

### Color Selection
- Click color swatches for quick color changes
- Use the eyedropper (I key) to sample colors from your painting
- Click and drag in the canvas while using eyedropper

### Efficient Workflow
- Learn keyboard shortcuts for faster tool switching
- Create multiple layers for different elements
- Use Ctrl/Cmd+Z frequently to experiment
- Save your work regularly

### Layer Organization
- Name layers descriptively (click layer name to rename - future feature)
- Use layer types to organize your work (Paint for drawing, Group for organizing) ⭐ NEW
- Keep related elements on the same layer
- Use separate layers for easy color/effect changes
- Toggle layer visibility to focus on specific elements
- Reorder layers with move up/down buttons to adjust composition ⭐ NEW
- Flatten layers when you're confident with your composition to improve performance ⭐ NEW

## Pressure Sensitivity

ARTemis fully supports pressure-sensitive input devices:

1. **Compatible Devices**
   - Wacom tablets
   - Microsoft Surface Pen
   - Apple Pencil (on supported devices)
   - Any tablet supporting Windows Ink or native pressure

2. **Pressure Settings**
   - Enable "Pressure affects opacity" for natural paint blending
   - Enable "Pressure affects size" for dynamic line variation
   - Both can be enabled simultaneously for maximum expressiveness

3. **Pressure Response**
   - Light pressure: 30% of maximum size/opacity
   - Full pressure: 100% of set size/opacity
   - Smooth interpolation between pressure levels

## Troubleshooting

### Issue: Brush not drawing
- Ensure an active layer is selected (highlighted in blue)
- Check brush opacity is above 0%
- Verify brush size is appropriate for your zoom level

### Issue: Can't see changes
- Check if the correct layer is active
- Verify layer visibility is enabled (eye icon)
- Make sure you're not zoomed out too far

### Issue: Application won't start
- Ensure Node.js is installed (version 16+)
- Run `npm install` to install dependencies
- Check console for error messages

### Issue: Pressure sensitivity not working
- Verify your device supports pressure input
- Check device drivers are up to date
- Test pressure in another application first
- Ensure pressure options are enabled in brush settings

## Advanced Features

### Undo/Redo System
- Up to 50 states saved in history
- Works across all layers
- Independent of tool selection
- Preserved during session (not across app restarts)

### Zoom and Pan
- Zoom range: 10% to 1000%
- Smooth zoom interpolation
- Pan while zoomed for precise work
- Canvas always centered when at 100%

### File Format
- **.artemis files** contain:
  - Canvas dimensions
  - All layers with full data
  - Layer visibility and opacity settings
  - Preserved for exact restoration

## Future Features (Roadmap)

- Custom brushes and brush presets
- Blend modes for layers
- Adjustment layers and filters
- Transform tools (rotate, scale, distort)
- Text tool with font selection
- Gradient and pattern fills
- Selection tools (lasso, magic wand)
- Layer effects and styles
- Customizable UI layouts
- Plugin system
- More export formats (PSD, TIFF, etc.)

## Performance Notes

- Large canvas sizes (>4000x4000) may affect performance
- More layers = more memory usage
- History is limited to 50 states to manage memory
- Closing and reopening clears undo history
- Export regularly to preserve work

## Getting Help

For bugs, feature requests, or questions:
- Check the README.md file
- Review this usage guide
- Submit issues on the project repository
- Contribute improvements via pull requests

Happy Painting! 🎨
