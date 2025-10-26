# ARTemis Advanced Brush Engine

## Overview

ARTemis now features a professional-grade brush engine, making it one of the most advanced brush implementations available in a digital painting application.

## 🎨 Key Features

### 1. **Brush Dynamics** ⭐
Advanced brush behavior controls that respond to your input in real-time:

#### Flow (Build-up)
- **Range:** 1-100%
- **Purpose:** Controls paint opacity for each brush dab, enabling natural paint layering
- **Use Case:** Lower flow values allow you to build up color gradually like traditional painting
- **Professional Tip:** Use 20-40% flow for realistic watercolor effects

#### Spacing
- **Range:** 1-100%
- **Purpose:** Controls the distance between individual brush dabs as a percentage of brush size
- **Use Case:** Lower spacing (5-15%) creates smooth strokes, higher spacing (30-100%) creates textured effects
- **Professional Tip:** Use 5-10% spacing for smooth ink-like strokes

### 2. **Stroke Smoothing** 🎯
- **Range:** 0-100
- **Purpose:** Stabilizes pen/mouse input for cleaner, more controlled strokes
- **How it Works:** Averages the last several points to reduce jitter and wobble
- **Use Case:** Essential for inking, line art, and precise work
- **Professional Tip:** Use 20-40 smoothing for line art, 0-10 for sketching

### 3. **Brush Rotation & Variation** 🔄

#### Angle
- **Range:** 0-360°
- **Purpose:** Rotates the brush tip by a fixed angle
- **Use Case:** Create calligraphy-style strokes or simulate angled brushes

#### Angle Jitter
- **Range:** 0-180°
- **Purpose:** Adds random rotation variation to each brush dab
- **Use Case:** Creates natural, organic textures that mimic real media
- **Professional Tip:** Combine with angle setting for realistic charcoal effects

### 4. **Scatter Effects** ✨

#### Scatter X & Y
- **Range:** 0-100% each
- **Purpose:** Randomly displaces brush dabs horizontally (X) and vertically (Y)
- **Use Case:** Creates spray paint, airbrush, or textured brush effects
- **Professional Tip:** Use equal X/Y scatter (15-20%) for airbrush, unequal for special effects

### 5. **Core Brush Settings** 🖌️

#### Size
- **Range:** 1-200px
- **Keyboard Shortcuts:** `[` decrease, `]` increase
- **Professional Tip:** Use pressure sensitivity for natural size variation

#### Opacity
- **Range:** 1-100%
- **Purpose:** Overall transparency of the brush stroke
- **Professional Tip:** Lower opacity (30-70%) for glazing and blending

#### Hardness
- **Range:** 0-100%
- **Purpose:** Controls the softness of brush edges
- **0%:** Completely soft, airbrush-like
- **50%:** Balanced soft-to-hard transition
- **100%:** Hard edges, crisp strokes

#### Pressure Sensitivity
- ✅ **Pressure affects opacity** - Light touch = transparent, heavy = opaque
- ✅ **Pressure affects size** - Light touch = small, heavy = large
- **Both can be enabled simultaneously** for maximum expressiveness

## 🎭 Brush Presets

Six professional brush presets inspired by traditional art media:

### 1. **Basic Brush**
- General-purpose digital painting brush
- Settings: Size 20, Opacity 100%, Hardness 80%, Flow 100%
- Use for: Sketching, general painting, opaque work

### 2. **Soft Brush**
- Smooth, blended strokes with edge softness
- Settings: Size 30, Opacity 80%, Hardness 20%, Flow 60%, Smoothing 20
- Use for: Soft shading, blending, portraits, smooth gradients

### 3. **Airbrush**
- Spray paint effect with natural scatter
- Settings: Size 40, Opacity 30%, Hardness 0%, Flow 20%, Scatter 15%
- Use for: Soft color application, graffiti effects, texture

### 4. **Charcoal**
- Textured, grainy strokes mimicking real charcoal
- Settings: Size 25, Opacity 70%, Angle 45°, Jitter 30°, Scatter Y 5%
- Use for: Sketching, drawing, traditional media look

### 5. **Ink Pen**
- Clean, precise lines with high smoothing
- Settings: Size 15, Opacity 100%, Hardness 100%, Smoothing 30
- Use for: Line art, inking, comics, precise work

### 6. **Watercolor**
- Transparent, flowing strokes with subtle texture
- Settings: Size 50, Opacity 40%, Hardness 10%, Flow 30%, Scatter 10%
- Use for: Watercolor painting, washes, transparent layers

## 🎯 Professional Workflows

### Digital Painting
1. Start with **Charcoal** preset for rough sketch
2. Switch to **Soft Brush** for base colors and shading
3. Use **Basic Brush** for detail work
4. Finish with **Ink Pen** for sharp accents

### Illustration
1. Use **Ink Pen** with high smoothing for clean line art
2. Apply **Airbrush** for soft shadows and highlights
3. Add texture with **Charcoal** brush on low opacity
4. Polish with **Basic Brush** for final details

### Concept Art
1. Quick forms with **Soft Brush** on low opacity
2. Build shapes with **Basic Brush** increasing opacity
3. Add atmosphere with **Airbrush** 
4. Define edges with **Ink Pen**

## 🔧 Technical Implementation

### Brush Engine Architecture

The brush engine uses several advanced algorithms:

1. **Interpolated Stroke Rendering**
   - Bresenham-style line drawing between input points
   - Dynamic spacing based on brush size and spacing setting
   - Pressure interpolation along stroke

2. **Smoothing Algorithm**
   - Moving average of last N points (configurable via smoothing slider)
   - Reduces input jitter while maintaining responsiveness
   - Pressure values are also smoothed for natural transitions

3. **Dab Rendering**
   - Radial gradients for soft edges
   - Canvas 2D transformations for rotation
   - Scatter applied before rendering each dab
   - Flow controls alpha layering

4. **Performance Optimizations**
   - Efficient spacing calculations minimize redundant dabs
   - Transform/restore pattern for rotation
   - Gradient caching through browser optimization

## 🎨 Professional-Grade Features

✅ **Core Features:**
- Brush spacing control
- Flow/build-up system
- Rotation and angle jitter
- Scatter effects
- Smoothing/stabilization
- Pressure sensitivity
- Brush presets

✅ **ARTemis Advantages:**
- Intuitive preset system
- Advanced scatter implementation
- Open-source and free
- Comprehensive brush dynamics

🔄 **Potential Future Additions:**
- Texture patterns
- Advanced blend modes
- Custom brush tip shapes
- Brush creator tool

## 📊 Technical Specifications

| Feature | Range | Default | Performance Impact |
|---------|-------|---------|-------------------|
| Size | 1-200px | 20px | Low |
| Opacity | 1-100% | 100% | None |
| Hardness | 0-100% | 80% | Low |
| Flow | 1-100% | 100% | None |
| Spacing | 1-100% | 10% | Medium (lower = more dabs) |
| Smoothing | 0-100 | 0 | Low |
| Angle | 0-360° | 0° | Low |
| Angle Jitter | 0-180° | 0° | Low |
| Scatter X/Y | 0-100% | 0% | None |

## 💡 Tips & Best Practices

### Performance
- Higher spacing values = better performance
- Lower brush sizes = better performance
- Smoothing has minimal performance impact

### Quality
- Use lower spacing (5-15%) for smoother strokes
- Enable smoothing for cleaner line work
- Adjust flow for natural paint buildup

### Workflow
- Save your favorite settings by noting preset values
- Experiment with scatter for unique textures
- Combine angle and jitter for realistic media simulation

### Tablet Users
- Enable both pressure sensitivity options for natural feel
- Adjust smoothing based on your tablet's precision
- Lower flow values work great with pressure opacity

### Mouse Users
- Increase smoothing (40-60) for cleaner strokes
- Use lower opacity with multiple passes
- Flow control helps build up colors gradually

## 🚀 Future Enhancements

Potential additions to make the brush engine even better:

- [ ] Custom brush tip shapes (square, textured, etc.)
- [ ] Texture/pattern overlays for brush tips
- [ ] Dual brush system (mix two brushes)
- [ ] Advanced blend modes (multiply, screen, overlay)
- [ ] Custom brush preset saving/loading
- [ ] Velocity-based dynamics
- [ ] Tilt sensitivity for supported devices
- [ ] Brush size preview in UI
- [ ] Live brush preview window

## 📚 Resources

### Learning More
- Experiment with different preset combinations
- Try recreating traditional media effects
- Study digital painting tutorials for brush techniques

### Contributing
See `CONTRIBUTING.md` for information on improving the brush engine

---

**With these advanced features, ARTemis now offers a professional-grade brush engine that rivals industry-standard applications. The key is the combination of spacing, flow, smoothing, and dynamics that work together to create natural, expressive digital painting tools.** 🎨✨
