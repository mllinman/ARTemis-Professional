# Node-Based Brush System

## Overview

ARTemis Professional now features a powerful node-based brush creation system, similar to NukeX/Nuke Studio, that allows you to create completely custom, modular brushes by connecting nodes together.

## Accessing the Node Editor

The Node Editor can be accessed through the **Windows** menu:
1. Click on **Windows** in the menu bar
2. Select **Node-Based Brush Editor**

The editor will open in a floating window that can be resized and repositioned.

## Node Types

### Input Nodes

#### Color Input
- **Output**: Color value
- **Parameters**: Color picker
- **Use**: Define a specific color for the brush

#### Value Input
- **Output**: Numeric value (0-100)
- **Parameters**: Adjustable value slider
- **Use**: Provide numeric inputs to other nodes

#### Texture Input
- **Output**: Texture data
- **Parameters**: Texture selection
- **Use**: Apply textures to brush strokes

### Brush Property Nodes

#### Size Node
- **Input**: Value (multiplier)
- **Output**: Brush size
- **Parameters**: 
  - Base Size (1-200px)
  - Multiplier (0.1-5.0)
- **Use**: Control brush size with optional dynamic input

#### Opacity Node
- **Input**: Value (multiplier)
- **Output**: Brush opacity
- **Parameters**:
  - Base Opacity (0-100%)
  - Multiplier (0-2.0)
- **Use**: Control brush opacity with optional dynamic input

#### Hardness Node
- **Input**: Value (optional)
- **Output**: Brush hardness
- **Parameters**: Hardness (0-100%)
- **Use**: Control edge softness of the brush

#### Flow Node
- **Input**: Value (optional)
- **Output**: Brush flow
- **Parameters**: Flow rate (0-100%)
- **Use**: Control paint buildup and layering

### Effect Nodes

#### Scatter Node
- **Input**: Amount (intensity)
- **Output**: Scatter X, Scatter Y
- **Parameters**:
  - Scatter X (0-100%)
  - Scatter Y (0-100%)
- **Use**: Add randomness to brush dab positioning

#### Rotation Node
- **Input**: Angle value
- **Output**: Rotation angle
- **Parameters**:
  - Base Angle (0-360°)
  - Jitter (0-180°)
- **Use**: Control brush rotation with optional randomness

#### Dynamics Node
- **Input**: Pressure value
- **Output**: Size multiplier, Opacity multiplier
- **Parameters**:
  - Pressure affects Size (0-100%)
  - Pressure affects Opacity (0-100%)
- **Use**: Make brush respond to pen pressure

#### Jitter Node
- **Input**: Base value
- **Output**: Jittered value
- **Parameters**: Jitter amount (0-100%)
- **Use**: Add random variation to any numeric value

### Math Nodes

#### Multiply Node
- **Inputs**: Value A, Value B
- **Output**: A × B
- **Use**: Combine values multiplicatively

#### Add Node
- **Inputs**: Value A, Value B
- **Output**: A + B
- **Use**: Combine values additively

#### Clamp Node
- **Input**: Value
- **Output**: Clamped value
- **Parameters**:
  - Min (0-100)
  - Max (0-100)
- **Use**: Limit value range

### Output Node

#### Brush Output
- **Inputs**: Size, Opacity, Hardness, Flow, Scatter X, Scatter Y, Rotation, Color
- **Output**: Final brush configuration
- **Use**: Required endpoint that defines the final brush settings

## Creating a Custom Brush

### Basic Workflow

1. **Open the Node Editor** from the Windows menu
2. **Add nodes** by clicking on node type buttons in the left panel
3. **Connect nodes** by:
   - Click and drag from an output socket (right side of node)
   - Release on an input socket (left side of another node)
4. **Adjust parameters** using the sliders in each node
5. **Preview the brush** in the Brush Preview panel on the right
6. **Save your brush** by:
   - Entering a brush name
   - Selecting a save location
   - Clicking "Save to Brushes"

### Example: Creating a Pressure-Sensitive Brush

1. Create a **Value Input** node (set to 50)
2. Create a **Size** node
3. Connect Value Input → Size node's Value input
4. Connect Size node → Brush Output's Size input
5. Adjust the Size node's base size and multiplier
6. Test and save

### Example: Creating a Scattered Textured Brush

1. Create a **Size** node (set base size to 30)
2. Create a **Scatter** node (set X and Y to 20%)
3. Create an **Opacity** node (set to 80%)
4. Connect Size → Brush Output Size
5. Connect Scatter → Brush Output Scatter X and Y
6. Connect Opacity → Brush Output Opacity
7. Save your brush

## Node Canvas Controls

### Navigation
- **Pan**: Click and drag with middle mouse button or Ctrl + Left mouse drag
- **Zoom**: Mouse wheel (future enhancement)

### Node Manipulation
- **Move nodes**: Click and drag the node header
- **Delete nodes**: Click the × button in the node header
- **Select nodes**: Click on the node (selected nodes have blue border)

### Connections
- **Create connection**: Drag from output socket to input socket
- **Delete connection**: Click on the connection line (future enhancement)
- **Valid connections**: Only matching types can be connected (number to number, color to color)

## Brush Preview

The Brush Preview panel shows a real-time preview of your custom brush:
- **Preview canvas**: Draw on the white canvas to test your brush
- **Live updates**: Preview updates automatically when you change node parameters
- **Brush preview stroke**: Shows a sample stroke with the current settings

## Saving Custom Brushes

### Save Locations

- **Custom Brushes**: Saves to your personal custom brush library
- **Favorites**: Quick-access favorite brushes
- **Current Project**: Project-specific brushes

### Brush Data

When you save a brush, the following is stored:
- All brush parameters (size, opacity, hardness, flow, etc.)
- Node graph structure for later editing
- Brush name and category

### Loading Node-Based Brushes

To edit a previously saved node-based brush:
1. Select the brush from the Brush Presets panel
2. Open the Node Editor
3. The node graph will be loaded automatically (future enhancement)

## Tips and Best Practices

### Performance
- Keep node graphs simple for better performance
- Complex graphs with many math nodes may slow down brush strokes
- Use the preview panel to test before saving

### Organization
- Use descriptive names for your custom brushes
- Group similar brushes in the same save location
- Consider the intended use when naming (e.g., "Soft Watercolor - Large")

### Experimentation
- Try connecting nodes in unexpected ways
- Use Jitter nodes to add natural variation
- Combine multiple effect nodes for complex behaviors
- Use Math nodes to create custom response curves

### Common Patterns

**Pressure-Sensitive Size**:
```
Value Input (pressure) → Size → Brush Output
```

**Scattered Airbrush**:
```
Size → Brush Output
Opacity (low) → Brush Output
Scatter (high X & Y) → Brush Output
```

**Textured Brush**:
```
Texture Input → Brush Output
Size → Brush Output
Hardness → Brush Output
```

**Dynamic Rotation**:
```
Value Input → Rotation (with jitter) → Brush Output
```

## Keyboard Shortcuts

Currently, the Node Editor supports mouse-based interaction. Keyboard shortcuts may be added in future versions.

## Troubleshooting

### Node Editor Won't Open
- Ensure the application is fully loaded
- Check the browser console for errors
- Try refreshing the page

### Connections Won't Create
- Ensure you're connecting compatible socket types
- Start dragging from an output socket (right side)
- End on an input socket (left side)
- Can't connect nodes to themselves

### Brush Not Saving
- Ensure you've entered a brush name
- Check that the Brush Output node has at least one input connected
- Verify the state.customBrushes array is available

### Preview Not Updating
- Try adjusting a node parameter
- Check that nodes are properly connected to the Brush Output
- Refresh the Node Editor by closing and reopening it

## Future Enhancements

Planned improvements for the Node-Based Brush System include:

- **More node types**: Gradient nodes, curve nodes, conditional nodes
- **Node groups**: Package multiple nodes into reusable groups
- **Copy/Paste nodes**: Duplicate node configurations
- **Node presets**: Pre-built node graphs for common brush types
- **Undo/Redo**: Full history support in the node editor
- **Search**: Filter nodes by name or category
- **Favorites**: Mark frequently used node types
- **Keyboard shortcuts**: Speed up node creation and manipulation
- **Connection editing**: Click to delete, reroute connections
- **Node comments**: Add notes to document your node graph
- **Export/Import**: Share node graphs as files
- **Templates**: Start from pre-made node graph templates

## Technical Details

### Node Graph Evaluation

The node system uses a depth-first evaluation algorithm:
1. Start at the Brush Output node
2. For each input, trace back to the source node
3. Evaluate source nodes recursively
4. Cache results to avoid duplicate calculations
5. Apply final values to brush settings

### Data Types

- **Number**: Float values (0-360 for angles, 0-100 for percentages, etc.)
- **Color**: Hex color strings (#RRGGBB)
- **Texture**: Image data or texture references

### Storage Format

Custom brushes with node graphs are stored in localStorage as JSON:
```json
{
  "name": "Custom Brush",
  "size": 20,
  "opacity": 100,
  "hardness": 80,
  "flow": 100,
  "spacing": 10,
  "smoothing": 0,
  "angle": 0,
  "angleJitter": 0,
  "scatterX": 0,
  "scatterY": 0,
  "nodeGraph": {
    "nodes": [...],
    "connections": [...]
  }
}
```

## Feedback and Support

We're continuously improving the Node-Based Brush System. If you encounter issues or have suggestions for new node types or features, please:

1. Check this documentation for solutions
2. Review the CONTRIBUTING.md file for guidelines
3. Open an issue on the GitHub repository
4. Join our community for discussions

---

**Version**: 1.0.0  
**Last Updated**: October 2025  
**Status**: ✅ Fully Functional
