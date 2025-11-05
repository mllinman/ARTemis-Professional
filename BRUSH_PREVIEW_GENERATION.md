# Brush Preview Image Generation

## Overview

This document describes the automatic brush preview image generation system implemented for ARTemis Professional.

## Implementation

The `generate-images.js` script automatically generates preview images for all brushes defined in the application. It now dynamically reads brush definitions from `src/renderer.js` and creates appropriate preview images for each brush type.

### Features

- **Dynamic Extraction**: Automatically extracts all 178 brush definitions from `src/renderer.js`
- **Type Classification**: Intelligently categorizes brushes based on name patterns and properties
- **Visual Accuracy**: Renders each brush preview using type-appropriate visual effects

### Brush Types Supported

The system recognizes and renders the following brush types:

- **Watercolor**: Soft, translucent strokes with bleeding effects
- **Oil**: Textured strokes with impasto effects
- **Acrylic**: Crisp, opaque strokes
- **Graphite/Pencil/Charcoal**: Textured, grainy strokes
- **Ink/Pen**: Sharp, precise lines
- **Marker**: Semi-transparent, smooth strokes
- **Airbrush**: Diffuse spray patterns
- **Pastel**: Chalky, textured strokes
- **Texture**: Pattern-based stamps
- **Effect**: Particle-based special effects
- **Hard/Soft**: Based on hardness property

### Generated Assets

**Brush Previews**: 178 preview images in `src/assets/brushes/`
- Size: 200x80 pixels
- Format: PNG with transparency
- Naming: `{brush-key}.png`

**Paper Textures**: 30 paper texture images in `src/assets/papers/`
- Size: 200x150 pixels
- Format: PNG
- Includes hot-pressed, cold-pressed, rough, canvas, and specialty papers

## Usage

To regenerate all preview images:

```bash
npm install  # Ensure canvas dependency is installed
node generate-images.js
```

This will:
1. Read all brush definitions from `src/renderer.js`
2. Generate 178 brush stroke preview images
3. Generate 30 paper texture images
4. Save all images to `src/assets/brushes/` and `src/assets/papers/`

## Technical Details

### Brush Property Mapping

The script maps brush properties to visual characteristics:

- **Size**: Controls stroke width
- **Opacity**: Controls transparency
- **Hardness**: Determines edge softness
- **Type**: Determines rendering algorithm

### Rendering Algorithms

Each brush type uses a specific rendering approach:

- **Watercolor**: Gradient-based with shadow blur for soft edges
- **Oil**: Multiple texture passes for impasto effect
- **Graphite**: Random texture application for paper tooth
- **Airbrush**: Particle distribution algorithm
- **Texture**: Grid-based stamp pattern

## Benefits

1. **Consistency**: All brushes have preview images
2. **Maintainability**: Adding new brushes automatically generates previews
3. **Performance**: Pre-generated images load instantly in UI
4. **Visual Accuracy**: Each preview reflects the brush's actual behavior
