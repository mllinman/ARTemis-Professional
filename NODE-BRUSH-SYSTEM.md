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

#### Pressure Input ⭐ NEW
- **Output**: Pressure value (0-100)
- **Parameters**: Pressure simulation slider
- **Use**: Simulate or read tablet pressure input

#### Velocity Input ⭐ NEW
- **Output**: Velocity value (0-100)
- **Parameters**: Velocity simulation slider
- **Use**: React to stroke speed/velocity

#### Tilt Input ⭐ NEW
- **Output**: Tilt X, Tilt Y
- **Parameters**: Tilt X and Y sliders
- **Use**: Read pen tilt for tablets/styluses

#### Rotation Input ⭐ NEW
- **Output**: Rotation angle (0-360°)
- **Parameters**: Rotation angle slider
- **Use**: Read pen barrel rotation

#### Random Input ⭐ NEW
- **Output**: Random value
- **Parameters**: Min, Max, Seed
- **Use**: Generate random values for variation

#### Time Input ⭐ NEW
- **Output**: Time-based value
- **Parameters**: Speed, Offset
- **Use**: Create animated/time-based effects

#### Gradient Input ⭐ NEW
- **Output**: Color from gradient
- **Parameters**: Start color, End color, Position
- **Use**: Generate gradient colors

#### Image Input ⭐ NEW
- **Output**: Image/texture data
- **Parameters**: Image URL
- **Use**: Load external images as textures

#### Noise Input ⭐ NEW
- **Output**: Noise value (0-100)
- **Parameters**: Scale, Octaves, Persistence
- **Use**: Generate Perlin/Simplex noise patterns

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

#### Spacing Node ⭐ NEW
- **Input**: Value (multiplier)
- **Output**: Spacing value
- **Parameters**: Base Spacing, Multiplier
- **Use**: Control brush dab spacing

#### Blending Mode Node ⭐ NEW
- **Input**: Mode value
- **Output**: Blend mode string
- **Parameters**: Blend mode selector
- **Use**: Set brush blending mode

#### Texture Blend Node ⭐ NEW
- **Input**: Texture, Amount
- **Output**: Blended texture
- **Parameters**: Blend amount (0-100%)
- **Use**: Blend textures with specified amount

#### Color Variation Node ⭐ NEW
- **Input**: Color
- **Output**: Varied color
- **Parameters**: Hue Jitter, Saturation Jitter, Brightness Jitter
- **Use**: Add random color variation

#### Scale Node ⭐ NEW
- **Input**: X, Y values
- **Output**: Scale X, Scale Y
- **Parameters**: Scale X, Scale Y percentages
- **Use**: Non-uniform brush scaling

#### Position Offset Node ⭐ NEW
- **Input**: X, Y values
- **Output**: Offset X, Offset Y
- **Parameters**: Offset X, Offset Y
- **Use**: Offset brush position

#### Wet Mix Node ⭐ NEW
- **Input**: Color, Wetness
- **Output**: Mixed color
- **Parameters**: Wetness, Bleed amount
- **Use**: Simulate wet paint mixing

#### Shape Node ⭐ NEW
- **Input**: Size
- **Output**: Shape definition
- **Parameters**: Shape type, Sides
- **Use**: Define custom brush shapes

#### Fade Node ⭐ NEW
- **Input**: Progress (0-100)
- **Output**: Fade amount
- **Parameters**: Fade In, Fade Out percentages
- **Use**: Fade brush in/out during stroke

#### Direction Node ⭐ NEW
- **Input**: Velocity
- **Output**: Angle
- **Parameters**: Sensitivity (0-100%)
- **Use**: Align brush with stroke direction

### Math Nodes

#### Multiply Node
- **Inputs**: Value A, Value B
- **Output**: A × B
- **Use**: Combine values multiplicatively

#### Add Node
- **Inputs**: Value A, Value B
- **Output**: A + B
- **Use**: Combine values additively

#### Subtract Node ⭐ NEW
- **Inputs**: Value A, Value B
- **Output**: A - B
- **Use**: Subtract values

#### Divide Node ⭐ NEW
- **Inputs**: Value A, Value B
- **Output**: A ÷ B
- **Use**: Divide values (safe division)

#### Power Node ⭐ NEW
- **Inputs**: Base, Exponent
- **Output**: Base ^ Exponent
- **Use**: Exponential operations

#### Min Node ⭐ NEW
- **Inputs**: Value A, Value B
- **Output**: Minimum of A and B
- **Use**: Select smaller value

#### Max Node ⭐ NEW
- **Inputs**: Value A, Value B
- **Output**: Maximum of A and B
- **Use**: Select larger value

#### Absolute Node ⭐ NEW
- **Input**: Value
- **Output**: |Value|
- **Use**: Get absolute value

#### Sine Node ⭐ NEW
- **Input**: Angle
- **Output**: Sine wave value
- **Parameters**: Frequency, Amplitude
- **Use**: Create sine wave patterns

#### Cosine Node ⭐ NEW
- **Input**: Angle
- **Output**: Cosine wave value
- **Parameters**: Frequency, Amplitude
- **Use**: Create cosine wave patterns

#### Remap Range Node ⭐ NEW
- **Input**: Value
- **Output**: Remapped value
- **Parameters**: In Min, In Max, Out Min, Out Max
- **Use**: Map value from one range to another

#### Smooth Step Node ⭐ NEW
- **Input**: Value
- **Output**: Smoothed value
- **Parameters**: Edge 0, Edge 1
- **Use**: Smooth interpolation between edges

#### Mix/Lerp Node ⭐ NEW
- **Inputs**: Value A, Value B, Factor
- **Output**: Interpolated value
- **Parameters**: Mix factor (0-100%)
- **Use**: Linear interpolation between values

#### Modulo Node ⭐ NEW
- **Inputs**: Value A, Value B
- **Output**: A mod B
- **Use**: Remainder operation

#### Clamp Node
- **Input**: Value
- **Output**: Clamped value
- **Parameters**:
  - Min (0-100)
  - Max (0-100)
- **Use**: Limit value range

### Color Nodes ⭐ NEW

#### HSV Adjust Node
- **Input**: Color
- **Output**: Adjusted color
- **Parameters**: Hue shift, Saturation shift, Value shift
- **Use**: Adjust color in HSV space

#### Color Mix Node
- **Input**: Color A, Color B, Mix amount
- **Output**: Mixed color
- **Parameters**: Mix amount (0-100%)
- **Use**: Blend two colors together

#### Color Ramp Node
- **Input**: Position (0-100)
- **Output**: Color from ramp
- **Parameters**: Color 1, Color 2, Color 3, Number of stops
- **Use**: Create multi-color gradients

### Curve Nodes ⭐ NEW

#### Curve Editor Node
- **Input**: Input value
- **Output**: Output value
- **Parameters**: Curve type (linear, ease-in, ease-out, ease-in-out, exponential), Strength
- **Use**: Apply custom response curves to values

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
- **Zoom In**: Ctrl + Mouse wheel up, or click **+** button ⭐ NEW
- **Zoom Out**: Ctrl + Mouse wheel down, or click **-** button ⭐ NEW
- **Reset Zoom**: Click **⊙** button ⭐ NEW
- **Zoom Level**: Display shows current zoom percentage ⭐ NEW

### Node Manipulation
- **Move nodes**: Click and drag the node header
- **Delete nodes**: Click the × button in the node header, or press **Delete** key ⭐ NEW
- **Select nodes**: Click on the node (selected nodes have blue border)
- **Deselect**: Press **Escape** key ⭐ NEW
- **Copy node**: Select node and press **Ctrl+C** ⭐ NEW
- **Paste node**: Press **Ctrl+V** ⭐ NEW
- **Duplicate node**: Select node and press **Ctrl+D** ⭐ NEW

### Connections
- **Create connection**: Drag from output socket to input socket
- **Delete connection**: Click on the connection line (future enhancement)
- **Valid connections**: Only matching types can be connected (number to number, color to color)

### Search & Filter ⭐ NEW
- **Search box**: Type to filter available nodes
- **Real-time filtering**: Nodes are filtered as you type
- **Category hiding**: Empty categories are hidden automatically

## Brush Preview

The Brush Preview panel shows a real-time preview of your custom brush:
- **Preview canvas**: Draw on the white canvas to test your brush
- **Live updates**: Preview updates automatically when you change node parameters
- **Brush preview stroke**: Shows a sample stroke with the current settings

## Node Graph Templates ⭐ NEW

Pre-built templates help you get started quickly with common brush configurations:

### Available Templates

1. **Pressure Sensitive**
   - Connects pressure input to size and opacity
   - Perfect for tablets with pressure sensitivity
   - Natural drawing experience

2. **Scattered Airbrush**
   - Creates soft, scattered brush strokes
   - Low opacity with high scatter
   - Ideal for soft shading and gradients

3. **Textured Brush**
   - Includes rotation with jitter
   - Moderate hardness for texture
   - Good for textured painting

4. **Color Dynamic**
   - Color variation with jitter
   - Creates natural color variation
   - Perfect for organic painting

### Using Templates
1. Click on a template button in the node palette
2. Confirm to clear current graph
3. Template nodes are created and connected automatically
4. Adjust parameters to customize

## Export & Import ⭐ NEW

### Exporting Node Graphs
1. Click the **Export** button in the header
2. Node graph is saved as JSON file
3. File can be shared with others
4. File name: `brush-node-graph.json`

### Importing Node Graphs
1. Click the **Import** button in the header
2. Select a `.json` file
3. Node graph is loaded automatically
4. Previous graph is replaced

### Use Cases
- **Share brushes**: Export and share your custom node graphs
- **Backup**: Save your favorite configurations
- **Version control**: Keep different versions of complex brushes
- **Collaboration**: Work with team members on brush designs

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

## Keyboard Shortcuts ⭐ NEW

The Node Editor now supports comprehensive keyboard shortcuts:

- **Delete**: Delete selected node
- **Escape**: Deselect current node
- **Ctrl+C**: Copy selected node
- **Ctrl+V**: Paste copied node
- **Ctrl+D**: Duplicate selected node
- **Ctrl+Wheel**: Zoom in/out
- **Middle Mouse Drag**: Pan canvas
- **Ctrl+Left Drag**: Pan canvas (alternative)

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

## Advanced Features ⭐ NEW

### Color Manipulation
The node system includes comprehensive color manipulation:
- **RGB to HSV conversion**: Seamless color space conversion
- **Color interpolation**: Smooth color blending
- **Gradient evaluation**: Multi-stop color gradients
- **Color variation**: Randomized hue, saturation, and brightness

### Mathematical Operations
Advanced math nodes enable complex brush behaviors:
- **Trigonometric functions**: Sine, cosine for wave patterns
- **Range mapping**: Remap values between different ranges
- **Smooth interpolation**: Smooth step and lerp functions
- **Safe operations**: Division by zero protection

### Dynamic Effects
Create responsive, dynamic brushes:
- **Time-based animation**: Animated brush effects
- **Velocity response**: React to stroke speed
- **Pressure dynamics**: Tablet pressure integration
- **Directional rotation**: Follow stroke direction

## Future Enhancements

Planned improvements for the Node-Based Brush System include:

- **Node groups**: Package multiple nodes into reusable groups
- **Undo/Redo**: Full history support in the node editor
- **Favorites**: Mark frequently used node types
- **Connection editing**: Click to delete, reroute connections
- **Node comments**: Add notes to document your node graph
- **Visual curve editor**: Interactive curve editing with control points
- **Conditional logic nodes**: If/else and comparison nodes
- **Boolean operations**: AND, OR, NOT logic gates
- **Minimap**: Overview of large node graphs
- **Node alignment tools**: Auto-align and distribute nodes
- **Grid snapping**: Snap nodes to grid for organization
- **Connection rerouting**: Cleaner connection paths
- **Node groups/macros**: Collapse complex graphs into single nodes

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

**Version**: 2.0.0  
**Last Updated**: October 2025  
**Status**: ✅ Fully Functional with 50+ Node Types

## What's New in Version 2.0

### Major Additions
- **50+ new node types** across multiple categories
- **Advanced input nodes**: Pressure, velocity, tilt, rotation, random, time, noise
- **Comprehensive math library**: 14 math operations including trigonometry
- **Color manipulation**: HSV adjust, color mix, gradients, color ramps
- **Advanced effects**: Spacing, blending, texture blend, color variation, fade, direction
- **Workflow enhancements**: Copy/paste, search, zoom, export/import, templates
- **4 preset templates** for quick brush creation
- **Full keyboard shortcuts** for efficient workflow
- **Zoom support** with mouse wheel and UI controls
- **Export/Import** functionality for sharing node graphs

### Node Count by Category
- **Input Nodes**: 12 types (Color, Value, Texture, Pressure, Velocity, Tilt, Rotation, Random, Time, Gradient, Image, Noise)
- **Brush Properties**: 4 types (Size, Opacity, Hardness, Flow)
- **Effect Nodes**: 14 types (Scatter, Rotation, Dynamics, Jitter, Spacing, Blending, Texture Blend, Color Variation, Scale, Position Offset, Wet Mix, Shape, Fade, Direction)
- **Math Nodes**: 14 types (Multiply, Add, Subtract, Divide, Power, Min, Max, Abs, Sine, Cosine, Remap, Smooth Step, Mix, Modulo, Clamp)
- **Color Nodes**: 3 types (HSV Adjust, Color Mix, Color Ramp)
- **Curve Nodes**: 1 type (Curve Editor with 5 curve types)
- **Output**: 1 type (Brush Output)

**Total**: 49 unique node types + templates and advanced features
