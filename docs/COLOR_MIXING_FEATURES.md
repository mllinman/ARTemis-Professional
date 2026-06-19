# ARTemis Color Mixing Features

## Overview

ARTemis now includes professional color mixing tools to help you craft the perfect color palette. These features enable you to create harmonious color schemes, mix colors, and work with predefined palettes.

## 🎨 Features

### 1. Color Wheel

An interactive HSV color wheel for intuitive color selection.

**How to use:**
1. Navigate to the **Color** section in the Tools panel
2. Click the **🎨 Color Wheel** button to show/hide the wheel
3. Click anywhere on the color wheel to select a color
4. View real-time HSV values (Hue, Saturation, Value)

**Benefits:**
- Visual color selection based on the HSV color model
- Precise control over hue, saturation, and value
- Interactive and intuitive interface

### 2. Color Mixer

Mix two colors together with adjustable blending ratio.

**How to use:**
1. Navigate to the **Color Mixer** section
2. Select **Color 1** using the color picker
3. Select **Color 2** using the color picker
4. Adjust the **Mix Ratio** slider (0-100%)
   - 0% = 100% Color 1
   - 50% = Equal blend
   - 100% = 100% Color 2
5. View the mixed result in the preview
6. Click **Use This Color** to apply the mixed color

**Benefits:**
- Create smooth color transitions
- Experiment with color blending
- Find intermediate colors between two hues

### 3. Color Harmonies

Generate harmonious color schemes based on color theory.

**Harmony Types:**

- **Complementary**: Two colors opposite on the color wheel
  - Creates high contrast and vibrant looks
  - Example: Red ↔ Cyan

- **Analogous**: Three colors adjacent on the color wheel
  - Creates serene and comfortable designs
  - Example: Red → Orange → Yellow

- **Triadic**: Three colors evenly spaced on the color wheel
  - Creates vibrant yet balanced schemes
  - Example: Red, Yellow, Blue (120° apart)

- **Tetradic (Square)**: Four colors evenly spaced on the color wheel
  - Creates dynamic and varied schemes
  - Example: Red, Green, Blue, Orange (90° apart)

- **Split-Complementary**: Base color plus two colors adjacent to its complement
  - Creates contrast with more variation
  - Example: Red + Turquoise + Lime

**How to use:**
1. Navigate to the **Color Harmonies** section
2. Select a **Harmony Type** from the dropdown
3. View the generated color swatches
4. Click any swatch to use that color
5. Colors automatically update when you change the base color

**Benefits:**
- Professional color schemes based on color theory
- Instant harmony generation
- Quick color exploration

### 4. Color Palettes

Work with predefined color palettes for quick access to curated color collections.

**Available Palettes:**

1. **Basic**: Primary and secondary colors (RGB + CMY + B&W)
2. **Pastel**: Soft, muted colors for gentle designs
3. **Earth Tones**: Natural browns, greens, and warm colors
4. **Vibrant**: High-saturation rainbow colors
5. **Monochrome**: Grayscale from black to light gray
6. **Sunset**: Warm oranges, reds, and purples
7. **Ocean**: Cool blues and aqua tones
8. **Forest**: Greens and nature-inspired colors

**How to use:**
1. Navigate to the **Color Palettes** section
2. Select a palette from the **Palette** dropdown
3. View the 8 colors in the palette
4. Click any color swatch to select it

**Benefits:**
- Quick access to curated color schemes
- Consistent color themes
- Ready-to-use palettes for different moods and themes

## 💡 Tips

### Creating Cohesive Artwork
1. Start by selecting a palette that matches your theme
2. Use Color Harmonies to expand your color options
3. Mix colors to create custom shades and tints
4. Save frequently used colors in your palette

### Color Theory Best Practices
- Use complementary colors for high contrast
- Use analogous colors for harmony
- Use triadic colors for balance with variety
- Limit your palette to 3-5 main colors for cohesion

### Mixing Colors
- Mix at 25% or 75% for subtle variations
- Mix at 50% for true midpoint colors
- Create gradients by mixing multiple steps between two colors

## 🎯 Use Cases

### Digital Painting
- Create custom skin tones by mixing base colors
- Generate shadow colors using Color Harmonies
- Build consistent color schemes across your artwork

### Concept Art
- Use predefined palettes for quick mood boarding
- Generate color variations with the mixer
- Explore harmonies for environmental color schemes

### Illustration
- Select complementary colors for focal points
- Use analogous schemes for backgrounds
- Mix custom colors for unique character palettes

## Technical Details

### Color Conversions
The system supports conversion between:
- HEX color codes (#RRGGBB)
- RGB (Red, Green, Blue) values
- HSV (Hue, Saturation, Value) color model

### Color Harmony Algorithms
- **Complementary**: 180° rotation on color wheel
- **Analogous**: ±30° from base color
- **Triadic**: 120° increments
- **Tetradic**: 90° increments
- **Split-Complementary**: 150° and 210° from base

### Integration
All color features integrate seamlessly with:
- Main color picker
- Brush tools
- Gradient tools
- Fill tools
- All painting and drawing tools

## 📸 Screenshots

See the implementation in action:
- Color Mixer with red and blue blending to purple
- Color Harmonies showing complementary colors
- Color Palettes with 8 vibrant colors
- Interactive color wheel for selection

## Future Enhancements

Potential future additions:
- Custom palette creation and saving
- Import/export color palettes
- Recent colors history
- Color blindness simulation
- Advanced gradient editor with multiple stops
