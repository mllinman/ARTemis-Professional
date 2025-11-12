# Krita-Inspired Features in ARTemis

This document describes the Krita-inspired features that have been integrated into ARTemis, translating Krita's powerful C++ tools and brushes into JavaScript implementations.

## Overview

ARTemis now includes advanced brush engines, blend modes, and specialized tools inspired by [Krita](https://krita.org), the professional open-source digital painting application. These features bring professional-grade capabilities to ARTemis while maintaining its browser-based, zero-dependency architecture.

## 🖌️ Krita-Inspired Brush Engines

### 1. Particle Brush Engine
**Inspired by:** Krita's `kis_particle_paintop.cpp`

Creates spray-like effects with particle physics simulation.

**Settings:**
- Particle Count: Number of particles per dab (1-50)
- Particle Size: Size of individual particles
- Particle Size Variation: Random size variation (0-100%)
- Spread: How far particles spread (0-200%)
- Gravity: Gravity effect on particles (0-100)
- Velocity Variation: Randomness in particle movement (0-100%)

**Brush Presets:**
- `krita-particle-spray` - General purpose particle spray
- `krita-particle-mist` - Soft, diffuse mist effect
- `krita-particle-splatter` - Irregular splatter patterns

**Use Cases:**
- Spray paint effects
- Atmospheric fog and mist
- Paint splatters and splashes
- Textured backgrounds

### 2. Bristle Brush Engine
**Inspired by:** Krita's `kis_bristle_paintop.cpp`

Simulates individual bristles for natural media effects.

**Settings:**
- Bristle Count: Number of bristles (1-50)
- Bristle Length: How far bristles splay (0-100%)
- Bristle Stiffness: How much bristles stay together (0-100%)
- Bristle Thickness: Thickness of individual bristles
- Ink Amount: How much ink each bristle carries (0-100%)
- Ink Depletion: How fast ink depletes (0-100%)

**Brush Presets:**
- `krita-bristle-oil` - Oil painting bristle brush
- `krita-bristle-acrylic` - Acrylic bristle brush
- `krita-bristle-watercolor` - Watercolor bristle brush
- `krita-bristle-fan` - Fan brush for blending

**Use Cases:**
- Natural media simulation
- Oil and acrylic painting
- Traditional brush strokes
- Realistic paint texture

### 3. Hatching Brush Engine
**Inspired by:** Krita's `kis_hatching_paintop.cpp`

Creates crosshatching patterns for artistic effects.

**Settings:**
- Angle: Primary hatching angle in degrees
- Separation: Distance between hatch lines
- Thickness: Line thickness
- Crosshatching Enabled: Enable second angle
- Crosshatching Angle: Second angle for crosshatching
- Separation Variation: Variation in line spacing (0-100%)
- Angle Variation: Variation in angle (0-180°)

**Brush Presets:**
- `krita-hatching-pen` - Technical pen hatching
- `krita-hatching-fine` - Fine crosshatching
- `krita-hatching-crosshatch` - Full crosshatching pattern

**Use Cases:**
- Technical illustration
- Comic book shading
- Engraving effects
- Pen and ink drawings

### 4. Chalk/Charcoal Brush Engine
**Inspired by:** Krita's chalk brush and dry media simulation

Creates textured, grainy strokes with accumulation.

**Settings:**
- Grain Size: Size of grain particles
- Grain Density: Density of grain (0-100%)
- Grain Contrast: Contrast of grain texture (0-100%)
- Paper Texture: Use paper texture simulation
- Accumulation: How much chalk accumulates (0-100%)
- Dust Spread: Chalk dust spreading (0-100%)

**Brush Presets:**
- `krita-chalk-soft` - Soft chalk for shading
- `krita-chalk-hard` - Hard chalk for details
- `krita-charcoal-stick` - Charcoal stick
- `krita-pastel-soft` - Soft pastel
- `krita-conte-crayon` - Conté crayon

**Use Cases:**
- Traditional drawing
- Sketching and shading
- Dry media effects
- Textured backgrounds

## 🎨 Advanced Blend Modes

### Krita-Inspired Composite Operations

ARTemis now includes 10 additional blend modes inspired by Krita's `KoCompositeOp` system:

1. **Grain Extract**
   - Extracts texture/grain from images
   - Formula: `result = source - destination + 128`
   - Use: Isolating textures and noise patterns

2. **Grain Merge**
   - Merges grain back into images
   - Formula: `result = source + destination - 128`
   - Use: Applying extracted textures

3. **Geometric Mean**
   - Averages colors geometrically
   - Formula: `result = sqrt(source * destination)`
   - Use: Darker blending than arithmetic mean

4. **Pin Light**
   - Combines darkening and lightening
   - Use: Extreme contrast effects

5. **Vivid Light**
   - Extreme contrast blend mode
   - Combines color burn and dodge
   - Use: High-impact lighting effects

6. **Linear Dodge (Add)**
   - Additive lightening
   - Formula: `result = source + destination`
   - Use: Intense lightening, glow effects

7. **Linear Burn**
   - Subtractive darkening
   - Formula: `result = source + destination - 255`
   - Use: Intense darkening effects

8. **Divide**
   - Divides destination by source
   - Formula: `result = (destination / source) * 255`
   - Use: Removing gradients, lightening

9. **Subtract**
   - Subtracts source from destination
   - Formula: `result = destination - source`
   - Use: Color reduction, darkening

10. **Hard Mix**
    - Creates posterized, high-contrast results
    - Use: Extreme stylization

### Usage

Blend modes can be applied to layers through the layer blend mode dropdown. Krita-inspired modes are available alongside standard modes (Normal, Multiply, Screen, etc.).

## 🛠️ Specialized Tools

### 1. Multibrush Tool
**Inspired by:** Krita's `kis_tool_multihand.cpp`

Paint with multiple symmetry axes simultaneously.

**Modes:**
- **Mirror**: Horizontal and/or vertical mirroring
- **Rotate**: Rotational symmetry around center point
- **Translate**: Multiple copies with translation
- **Snowflake**: Radial symmetry with mirroring

**Settings:**
- Axes/Copies: Number of symmetry axes (2-16)
- Show Axes: Display symmetry guidelines
- Center Point: Adjustable center of symmetry

**Usage:**
1. Enable "Krita Multibrush" in brush settings
2. Select mode (Mirror, Rotate, etc.)
3. Adjust number of axes
4. Paint - brush strokes are automatically duplicated

**Use Cases:**
- Mandala and kaleidoscope art
- Pattern design
- Symmetrical illustrations
- Technical drawings

### 2. Assistant Tool
**Inspired by:** Krita's `kis_assistant_tool.cpp`

Provides perspective guides and vanishing points.

**Assistant Types:**
- **Perspective**: One or two-point perspective with vanishing points
- **Parallel**: Parallel ruler for consistent angles
- **Grid**: Regular grid with subdivisions

**Settings:**
- Snap to Assistant: Enable snapping to guides
- Snap Distance: Distance for snapping (5-50px)
- Show Assistants: Display guide overlays

**Creating Assistants:**
1. Enable "Krita Assistant" in brush settings
2. Click "Add Perspective", "Add Parallel", or "Add Grid"
3. Assistants are placed at canvas center
4. Enable snapping to constrain brush strokes to guides

**Use Cases:**
- Architectural drawings
- Perspective illustration
- Technical drawings
- Consistent line work

### 3. Deform Brush Tool
**Inspired by:** Krita's `kis_tool_deform.cpp`

Dynamically warp pixels for creative effects.

**Modes:**
- **Move**: Push pixels in stroke direction
- **Grow**: Expand pixels outward from center
- **Shrink**: Pull pixels toward center
- **Swirl**: Rotate pixels around center
- **Pinch**: Pinch effect toward center

**Settings:**
- Strength: Effect intensity (0-100%)
- Size: Brush size for deformation
- Hardness: Edge hardness (0-100%)

**Usage:**
Currently available as a tool class in `krita-tools.js`. UI integration coming soon.

**Use Cases:**
- Creative warping effects
- Caricature adjustments
- Special effects
- Image manipulation

## 📋 Brush Category

All Krita-inspired brushes are organized in the "🖌️ Krita-Inspired (15)" category in the brush selector.

**Total Brushes:** 15 presets across 4 engine types
- 3 Particle brushes
- 4 Bristle brushes
- 3 Hatching brushes
- 5 Chalk/Charcoal brushes

## 🎯 Comparison with Krita

### What's Implemented

✅ **Brush Engines:**
- Particle brush with physics
- Bristle brush with individual bristles
- Hatching brush with crosshatching
- Chalk/dry media simulation

✅ **Blend Modes:**
- 10 advanced compositing operations
- Pixel-level blending algorithms

✅ **Tools:**
- Multibrush (multi-axis symmetry)
- Assistant (perspective guides)
- Deform brush (pixel warping)

### Key Differences

**Implementation:**
- Krita: C++ with Qt framework
- ARTemis: Pure JavaScript/HTML5 Canvas

**Architecture:**
- Krita: Desktop application
- ARTemis: Browser-based, zero dependencies

**Performance:**
- Krita: Native compiled code
- ARTemis: Optimized JavaScript, hardware acceleration where possible

## 🚀 Future Enhancements

Planned additions inspired by Krita:

1. **Additional Brush Engines:**
   - Shape brush engine
   - Curve brush engine
   - Filter brush engine
   - Spray brush engine

2. **Enhanced Tools:**
   - Reference image system
   - Layer styles
   - Filter masks
   - Transform masks

3. **UI Improvements:**
   - Brush editor with real-time preview
   - Tag-based brush organization
   - Preset bundles
   - Resource management

## 📚 Technical Reference

### Source Files

- `src/krita-brush-engines.js` - Brush engine implementations
- `src/krita-blend-modes.js` - Blend mode algorithms
- `src/krita-tools.js` - Specialized tool classes

### Krita Documentation

- [Krita Manual](https://docs.krita.org/)
- [Krita GitHub](https://github.com/KDE/krita)
- [Brush Engines Reference](https://docs.krita.org/en/reference_manual/brushes/brush_engines.html)

### Credits

These features are inspired by and based on Krita's open-source codebase:
- Copyright (C) KDE Contributors
- Licensed under GNU GPL v2+

ARTemis implementation:
- Copyright (C) BulletDrop Studios LLC
- Licensed under MIT

## 🤝 Contributing

To add more Krita-inspired features:

1. Study Krita's source code for the desired feature
2. Implement JavaScript equivalent in appropriate module
3. Add UI controls in `index.html`
4. Wire up event handlers in `renderer.js`
5. Add brush presets or tool configurations
6. Update this documentation

## 📖 Usage Examples

### Creating Atmospheric Effects with Particle Brush

```javascript
// Select particle brush
selectBrushPreset('krita-particle-mist');

// Adjust settings for fog effect
state.brush.size = 80;
state.brush.opacity = 30;
state.brush.flow = 20;

// Paint with low pressure for subtle effects
```

### Drawing with Hatching for Comics

```javascript
// Select hatching brush
selectBrushPreset('krita-hatching-crosshatch');

// Set angle for shading direction
state.brush.angle = 45;

// Use for shadow areas
```

### Natural Media with Bristle Brush

```javascript
// Select bristle oil brush
selectBrushPreset('krita-bristle-oil');

// Enable color mixing for realistic paint
state.brush.colorMixing = 60;

// Paint with varying pressure
```

---

**Note:** This is a living document that will be updated as more Krita-inspired features are added to ARTemis.
