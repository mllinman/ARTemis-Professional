# Realistic Paint Tools Implementation

## Overview

ARTemis now features enhanced realistic paint tools that replicate the look, feel, and behavior of professional art supplies used by traditional artists.

## Implemented Enhancements

### 1. Oil Paint Brushes - Winsor Newton / Grumbacher Max Characteristics ✅

**Enhanced Oil Paint Texture:**
- **Buttery Consistency**: Realistic thick paint texture with visible impasto ridges
- **Canvas Weave**: Fine linen weave pattern visible in paint strokes
- **Paint Ridges**: Thick impasto effect showing paint buildup
- **Flow Characteristics**: Subtle directional streaking mimicking real oil flow
- **Rich Pigment Loading**: Enhanced opacity and coverage

**Optimized Brush Presets:**
- Oil Paint: 35px, 93% opacity, 52% hardness, 75% flow
- Oil Flat: 40px, 95% opacity, 58% hardness, 80% flow  
- Oil Round: 32px, 91% opacity, 54% hardness, 78% flow
- Oil Fan: 45px, 78% opacity, 50% hardness, 72% flow
- Oil Filbert: 38px, 90% opacity, 60% hardness, 82% flow
- Palette Knife: 50px, 97% opacity, 72% hardness, 92% flow
- Impasto: 42px, 95% opacity, 68% hardness, 88% flow
- Oil Glaze: 55px, 48% opacity, 38% hardness, 50% flow
- Oil Detail: 20px, 92% opacity, 65% hardness, 85% flow
- Oil Textured: 36px, 85% opacity, 55% hardness, 75% flow

### 2. Sable Hair Brush Characteristics ✅

**Winsor Newton Series 7 Kolinsky Sable:**
- **Natural Hair Spring**: Adjusted flow and spacing for flexible response
- **Stroke Tapering**: Better pressure response for natural stroke endings
- **Subtle Variations**: Optimized angle jitter for organic feel
- **Smooth Flow**: Enhanced smoothing settings for controlled application

**Professional Sable Presets:**
- W&N Oil Round: 28px, 94% opacity, 58% hardness, 82% flow, 11° jitter
- W&N Oil Flat: 38px, 96% opacity, 62% hardness, 86% flow, 8° jitter
- W&N Acrylic Round: 26px, 95% opacity, 70% hardness, 90% flow, 7° jitter
- W&N Acrylic Flat: 36px, 97% opacity, 74% hardness, 94% flow, 6° jitter

### 3. Copic Marker Characteristics ✅

**Alcohol-Based Marker Texture:**
- **Translucent Layering**: Lower opacity (72-75%) for buildable color
- **Streak Patterns**: Realistic alcohol-based ink streaking
- **Slight Bleed**: Edge bleeding effect mimicking marker behavior
- **Smooth Flow**: High flow with subtle scatter for natural application

**Copic-Style Presets:**
- Marker: 30px, 72% opacity, 65% hardness, 88% flow, 2° jitter, 3% scatter
- Marker Chisel: 35px, 75% opacity, 70% hardness, 92% flow, 3° jitter, 4% scatter

### 4. FW Acrylic India Ink Characteristics ✅

**Rich, Dense Pigment Appearance:**
- **Crisp Edges**: High hardness (95-98%) for clean, sharp lines
- **Consistent Flow**: Maximum flow (97-100%) for even coverage
- **Dense Pigment**: Full opacity (100%) for rich black
- **Precise Application**: High smoothing (28-42) for controlled strokes

**FW Ink-Style Presets:**
- Ink: 15px, 100% opacity, 95% hardness, 98% flow, 32 smoothing
- Ink Fine: 8px, 100% opacity, 97% hardness, 99% flow, 38 smoothing
- Ink Bold: 25px, 100% opacity, 93% hardness, 97% flow, 28 smoothing
- Technical Pen: 10px, 100% opacity, 98% hardness, 100% flow, 42 smoothing

### 5. Wet vs Dry Paper Behavior ✅

**Paper Wetness System:**
- **Wetness Control**: Slider from 0% (dry) to 100% (very wet)
- **Dynamic Response**: All media types respond to paper wetness
- **Real-time Adjustment**: Change paper wetness at any time

**Dry Paper (0% wetness):**
- **Oil Paint**: Maximum texture clarity with visible canvas weave and impasto ridges
- **Watercolor**: Controlled bleeding, more texture visible
- **Pencil**: Enhanced paper tooth shows more grain variation
- **Markers**: Standard behavior with minimal bleed

**Wet Paper (100% wetness):**
- **Watercolor**: 
  - Increased bleeding radius (1.2x to 1.7x)
  - Enhanced color bleeding and mixing
  - Softer, more diffused edges
  - Smoother appearance with less texture
- **Oil Paint**: Reduced texture clarity (oil and water don't mix well)
- **Pencil**: Less tooth visible, smoother application
- **Ink/Markers**: Enhanced bleeding for special effects

**Paper Properties Affected:**
- Absorbency (0-10): Controls watercolor absorption rate
- Re-wet (1-10): Affects blending with existing paint
- Texture Influence (0-10): Impact of canvas texture
- Edge Darkening (0-10): Wash edge darkness
- **NEW: Paper Wetness (0-100%)**: Overall paper moisture level

## Technical Implementation

### Texture Generation

**Enhanced Oil Texture (`generateOilTexture`):**
```javascript
- Canvas weave pattern (fine linen)
- Impasto ridge texture
- Buttery flow characteristics
- Soft edge falloff
- Paper wetness response
```

**New Marker Texture (`generateMarkerTexture`):**
```javascript
- Alcohol-based streaking pattern
- Translucent layering effect
- Edge bleeding control
- Copic-style appearance
```

**Enhanced Watercolor Texture (`generateWatercolorTexture`):**
```javascript
- Dynamic bleeding based on paper wetness
- Variable bleed radius (1.2x to 1.7x)
- Texture strength adjustment
- No caching for wet paper variations
```

**Enhanced Pencil Texture (`generatePencilTexture`):**
```javascript
- Paper tooth response
- Variable grain based on wetness
- More texture on dry paper
```

### Brush Category System

**New Categories:**
- `'marker'` - Copic-style alcohol-based markers
- `'ink'` - FW Acrylic India Ink style
- `'oil'` - Winsor Newton/Grumbacher Max oils
- `'watercolor'` - Traditional watercolor behavior
- `'pencil'` - Graphite with paper tooth response

## Usage

### Using Realistic Oil Paints

1. Select **Brush Presets** → **Oil Paint (10)** category
2. Choose any oil brush (Oil Paint, Oil Flat, Oil Round, etc.)
3. Paint with natural pressure variation for impasto effects
4. Lower flow for glazing techniques
5. Works best on dry paper

### Using Copic-Style Markers

1. Select **Brush Presets** → **Ink & Pen (10)** category
2. Choose **Marker** or **Marker Chisel**
3. Layer strokes for color buildup
4. Use lighter pressure for translucent effects
5. Blend while strokes are fresh

### Using FW Acrylic India Ink

1. Select **Brush Presets** → **Ink & Pen (10)** category
2. Choose **Ink**, **Ink Fine**, or **Technical Pen**
3. High smoothing ensures clean, controlled lines
4. Perfect for comic inking and detailed line work

### Adjusting Paper Wetness

1. Enable **✏️ Rebelle 8 Paper Panel** in Advanced Features
2. Adjust **Paper Wetness** slider:
   - 0% = Completely dry (maximum texture, controlled application)
   - 50% = Slightly damp (moderate bleeding)
   - 100% = Very wet (maximum bleeding, soft edges)
3. Wetness affects:
   - Watercolor bleeding and softness
   - Oil paint texture clarity
   - Pencil grain visibility
   - Overall media behavior

## Best Practices

### Oil Painting
- Use dry paper (0% wetness) for best results
- Layer strokes for rich color buildup
- Higher flow (75-95%) for opaque coverage
- Lower flow (45-50%) for glazing

### Marker Work
- Start with dry paper
- Build color through multiple layers
- Use chisel tip at angle for varied line width
- Blend by working quickly over adjacent areas

### Ink Drawing
- Maximum smoothing (30-42) for clean lines
- High flow ensures consistent coverage
- Technical pen for precise work
- Fine nib for detail work

### Watercolor
- Experiment with paper wetness
- Dry paper (0-30%) for controlled washes
- Wet paper (70-100%) for bleeding effects
- Layer washes when paper is slightly damp (40-60%)

## Screenshot

![Rebelle Paper Panel with Wetness Control](https://github.com/user-attachments/assets/282d8993-8b6d-49e8-b39c-dc4ea2bc4a88)

The new **Paper Wetness** control appears in the Rebelle 8 Paper Panel, allowing real-time adjustment of paper moisture for realistic paint behavior.

## Future Enhancements

Potential improvements for even more realistic behavior:

- [ ] Automatic drying over time
- [ ] Per-layer wetness tracking
- [ ] Wet-into-wet color mixing
- [ ] Paper buckling simulation at high wetness
- [ ] Drip and run effects on vertical surfaces
- [ ] Color bleeding patterns based on pigment properties
- [ ] Natural edge darkening for watercolor pools

## Conclusion

These enhancements bring ARTemis closer to the experience of working with professional traditional art supplies, providing artists with familiar behaviors from Winsor Newton oils, Kolinsky Sable brushes, Copic markers, and FW Acrylic India Inks.
