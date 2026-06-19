# Photo-to-Paint Features Guide

## Overview

ARTemis now includes a powerful Photo-to-Paint system that transforms photographs into artistic paintings with 7 different styles. Each style includes real-time adjustable parameters for complete creative control.

## Accessing Photo-to-Paint

1. Open the **Tools Panel** (left side)
2. Scroll down to the **"🎨 Photo-to-Paint Styles"** section
3. Select your desired art style from the dropdown
4. Adjust the style-specific parameters
5. Click **Apply Style** to transform your image

## Available Styles

### 1. Oil Paint Style

Transforms photos into realistic oil paintings with visible brush strokes and impasto effects.

**Parameters:**
- **Brush Size** (1-10): Size of the oil brush strokes. Larger values create more visible brush marks.
- **Detail** (0-100%): Amount of detail preserved. Higher values keep more fine details.
- **Impasto** (0-100%): Thickness of paint texture. Higher values create more 3D paint effect.
- **Color Intensity** (50-200%): Vibrancy of colors. Values above 100% create richer, more saturated colors.

**Best For:** Portraits, landscapes, traditional painting look

**Recommended Settings:**
- Portrait: Brush Size 4, Detail 60%, Impasto 50%, Color Intensity 110%
- Landscape: Brush Size 6, Detail 40%, Impasto 70%, Color Intensity 130%

---

### 2. Acrylic Style

Creates bold, flat areas of color with crisp edges, mimicking acrylic painting.

**Parameters:**
- **Color Steps** (3-16): Number of distinct color levels. Lower values create more posterized look.
- **Edge Threshold** (10-100): Sensitivity for detecting edges. Higher values preserve more edges.
- **Saturation** (50-200%): Color saturation boost. Higher values create more vibrant colors.

**Best For:** Modern art, pop art, bold graphics

**Recommended Settings:**
- Pop Art: Color Steps 6, Edge Threshold 40, Saturation 150%
- Abstract: Color Steps 8, Edge Threshold 30, Saturation 130%

---

### 3. Watercolor Style

Simulates watercolor painting with soft edges, color bleeding, and paper texture.

**Parameters:**
- **Wetness** (0-100%): How wet the paint appears. Higher values create more blending and softer edges.
- **Bleed** (0-100%): Amount of color bleeding. Higher values increase color spreading.
- **Paper Texture** (0-100%): Visible paper grain. Higher values add more texture.

**Best For:** Florals, soft portraits, atmospheric scenes

**Recommended Settings:**
- Floral: Wetness 70%, Bleed 60%, Paper Texture 40%
- Portrait: Wetness 50%, Bleed 40%, Paper Texture 25%

---

### 4. Comic Book Style

Creates comic book art with bold black outlines, flat colors, and halftone shading.

**Parameters:**
- **Outline Thickness** (1-5): Width of black outlines. Higher values create bolder lines.
- **Color Levels** (2-8): Number of colors per channel. Lower values create flatter comic look.
- **Halftone** (0-100%): Dot pattern in shadows. Higher values add more halftone shading.

**Best For:** Characters, action scenes, graphic novels

**Recommended Settings:**
- Classic Comic: Outline 2, Color Levels 4, Halftone 50%
- Modern Comic: Outline 3, Color Levels 6, Halftone 30%

---

### 5. Cartoon Style

Simplifies photos into smooth, colorful cartoons with clean edges.

**Parameters:**
- **Smoothness** (0-100%): How smooth the color areas are. Higher values create cleaner cartoons.
- **Color Simplification** (3-12): Number of color levels. Lower values create simpler cartoons.
- **Outline Strength** (0-100%): Boldness of outlines. Higher values create stronger edge lines.

**Best For:** Character designs, simplified portraits, animation style

**Recommended Settings:**
- Character: Smoothness 80%, Color Simplification 6, Outline 90%
- Background: Smoothness 70%, Color Simplification 8, Outline 60%

---

### 6. Anime Style

Creates clean anime/manga style with cel shading and precise edges.

**Parameters:**
- **Cel Levels** (2-6): Number of shadow levels. 3 is typical anime style.
- **Edge Thickness** (1-3): Width of outline strokes. 1 for subtle, 2-3 for bold.
- **Saturation** (100-200%): Color vibrancy. Anime typically uses high saturation (140%+).

**Best For:** Character art, anime style illustrations, fan art

**Recommended Settings:**
- Classic Anime: Cel Levels 3, Edge Thickness 1, Saturation 140%
- Bold Anime: Cel Levels 2, Edge Thickness 2, Saturation 160%

---

### 7. Concept Art Style

Creates painterly concept art with atmospheric depth and mood lighting.

**Parameters:**
- **Atmospheric Depth** (0-100%): Creates depth with atmospheric haze. Higher values add more distance fog.
- **Painterly** (0-100%): Brush stroke visibility. Higher values create more painterly look.
- **Color Mood**: Overall color tone
  - **Neutral**: Balanced colors
  - **Warm**: Orange/red tint for sunset/fire scenes
  - **Cool**: Blue tint for night/winter scenes

**Best For:** Environment art, mood pieces, game concept art

**Recommended Settings:**
- Environment: Atmospheric Depth 60%, Painterly 70%, Mood: Warm
- Character Focus: Atmospheric Depth 30%, Painterly 50%, Mood: Neutral

---

## Tips and Best Practices

### General Tips

1. **Start with High-Quality Images**: Better source photos produce better results
2. **Experiment with Settings**: Each image responds differently to settings
3. **Use Undo**: Press Ctrl+Z if you don't like the result and try different settings
4. **Layer Before Applying**: Duplicate your layer before applying effects for non-destructive editing
5. **Combine Styles**: Apply multiple styles in sequence for unique effects

### Workflow Recommendations

#### For Best Results:

1. **Prepare Your Image**
   - Adjust brightness and contrast first if needed
   - Consider cropping to focus on main subject
   
2. **Choose the Right Style**
   - Oil/Acrylic: For traditional painting look
   - Watercolor: For soft, artistic feel
   - Comic/Cartoon: For stylized, graphic look
   - Anime: For clean, cel-shaded style
   - Concept Art: For atmospheric scenes

3. **Adjust Parameters**
   - Start with default values
   - Adjust one parameter at a time
   - Preview often (use Apply and Undo to test)

4. **Post-Processing**
   - Use filters to enhance results (brightness, contrast)
   - Paint additional details with brushes
   - Add text or shapes for finished artwork

### Performance Notes

- **Large Images**: Photo-to-Paint filters may take several seconds on large canvases
- **Multiple Applications**: You can apply different filters in sequence for unique combinations
- **Undo Available**: All filters are added to undo history

### Creative Combinations

**Vintage Comic Book:**
1. Apply Comic Book style (Outline 2, Colors 4, Halftone 60%)
2. Apply slight Sepia tone (use Color filters)

**Impressionist Oil:**
1. Apply Oil Paint (Brush 7, Detail 40%, Impasto 80%, Color 140%)
2. Add slight Blur filter for softer look

**Anime Watercolor:**
1. Apply Watercolor (Wetness 60%, Bleed 50%, Paper 30%)
2. Apply Anime style (Cel 3, Edge 1, Saturation 120%)

---

## Technical Details

### Algorithms Used

- **Oil Paint**: Neighborhood averaging with impasto texture simulation
- **Acrylic**: HSL color space manipulation with posterization
- **Watercolor**: Box blur with paper texture noise
- **Comic Book**: Sobel edge detection with posterization and halftone patterns
- **Cartoon**: Bilateral filtering with color quantization
- **Anime**: HSL saturation boost with cel-shading quantization
- **Concept Art**: Atmospheric perspective with painterly blur

### Browser Compatibility

All Photo-to-Paint styles work in:
- Chrome/Edge 80+
- Firefox 75+
- Safari 13+
- Any modern browser with Canvas API support

---

## Keyboard Shortcuts

While no specific shortcuts are assigned to Photo-to-Paint, you can:
- **Ctrl+Z**: Undo applied filter
- **Ctrl+Shift+Z**: Redo
- **Ctrl+D**: Duplicate layer before applying (recommended)

---

## Troubleshooting

**Filter Takes Too Long:**
- Close other browser tabs
- Reduce canvas size if working with very large images
- Some styles (Oil, Concept Art) are more computationally intensive

**Colors Don't Look Right:**
- Adjust the saturation/color intensity parameters
- Try a different color mood setting (Concept Art)
- Apply brightness/contrast adjustments first

**Too Much Detail Lost:**
- Increase Detail parameter (Oil Paint)
- Decrease Smoothness parameter (Cartoon)
- Use higher Color Steps/Levels values

**Outlines Too Thick/Thin:**
- Adjust Outline Thickness (Comic Book)
- Adjust Edge Thickness (Anime)
- Adjust Outline Strength (Cartoon)

---

## New Styles (Recently Added)

### 8. Pastel Style

Creates soft, muted colors with a chalk-like texture, perfect for gentle and artistic portraits.

**Parameters:**
- **Softness** (0-100%): How soft and blurred the colors are. Higher values create a dreamier effect.
- **Chalkiness** (0-100%): Amount of chalk texture noise. Higher values add more visible chalk grain.
- **Color Vibrancy** (0-100%): Vibrancy of the pastel colors. Lower values create more muted pastels.

**Best For:** Soft portraits, dreamy landscapes, gentle illustrations

**Recommended Settings:**
- Soft Portrait: Softness 80%, Chalkiness 50%, Vibrancy 70%
- Landscape: Softness 70%, Chalkiness 60%, Vibrancy 80%

---

### 9. Sketch Style

Transforms photos into pencil sketches with hatching and realistic line work.

**Parameters:**
- **Line Intensity** (0-100%): Darkness of the sketch lines. Higher values create bolder lines.
- **Shading** (0-100%): Amount of hatching for shading. Higher values add more cross-hatching.
- **Detail** (0-100%): Level of detail in the sketch. Higher values capture more fine details.

**Best For:** Artistic portraits, architectural drawings, concept sketches

**Recommended Settings:**
- Portrait Sketch: Line 80%, Shading 60%, Detail 70%
- Architectural: Line 90%, Shading 40%, Detail 90%

---

### 10. Gouache Style

Creates opaque, matte paint with bold colors and visible brush strokes, mimicking traditional gouache painting.

**Parameters:**
- **Opacity** (0-100%): Paint opacity. Higher values create more opaque, matte finish.
- **Color Boldness** (50-200%): Boldness and saturation of colors. Higher values create more vibrant gouache colors.
- **Brush Strokes** (0-100%): Visibility of brush strokes. Higher values show more directional brush work.

**Best For:** Poster art, illustration, bold graphic designs

**Recommended Settings:**
- Poster Art: Opacity 95%, Boldness 150%, Brush Strokes 70%
- Illustration: Opacity 90%, Boldness 130%, Brush Strokes 60%

---

## New Features

### Real-time Preview Mode (Non-destructive) ✨

The Photo-to-Paint system now includes a real-time preview mode that lets you see the effect before committing to it!

**How to Use:**
1. Select your desired style and adjust parameters
2. Click **"👁️ Preview (Non-destructive)"** button
3. The effect is applied temporarily - your original image is preserved
4. Click **"✓ Accept Preview"** to keep the effect, or **"✗ Cancel Preview"** to restore original
5. You can adjust parameters and preview again without losing your original image

**Benefits:**
- Non-destructive workflow - original image is always safe
- Experiment freely with different settings
- No need to undo - just cancel the preview
- Perfect for finding the right settings before committing

---

### Custom Presets System 💾

Save your favorite style settings as presets for quick reuse!

**How to Use:**
1. Configure a style with your preferred settings
2. Click **"💾 Save"** button
3. Enter a name for your preset (e.g., "Portrait Oil - Soft")
4. The preset is saved to localStorage
5. Select from the **"Preset"** dropdown to load saved settings
6. Click **"🗑️ Delete"** to remove unwanted presets

**Benefits:**
- Quick access to your favorite style configurations
- Consistent results across multiple images
- Share presets by exporting (stored in browser localStorage)
- Build your own preset library

**Preset Ideas:**
- "Soft Portrait Oil" - gentle oil paint for portraits
- "Bold Comic Book" - high contrast comic style
- "Dreamy Watercolor" - soft, ethereal watercolor
- "Classic Anime" - standard 3-cel anime look

---

### Batch Processing 📚

Apply the same style to multiple layers at once!

**How to Use:**
1. Configure your desired style and settings
2. Click **"📚 Batch Process All Layers"** button
3. Confirm the action
4. The style is applied to all layers in your document

**Benefits:**
- Save time when processing multiple layers
- Consistent styling across all layers
- Perfect for applying effects to complex compositions
- Single undo/redo for entire batch operation

**Use Cases:**
- Apply watercolor effect to all elements in a scene
- Convert all photo layers to sketch style
- Uniform styling for animation frames

---

### Style Blending 🎨

Mix two different styles together for unique artistic effects!

**How to Use:**
1. Select and configure your first style
2. Click **"🎨 Blend Two Styles"** button
3. Enter the name of the second style to blend (e.g., "watercolor")
4. Enter blend ratio (0-1, where 0.5 is 50/50 mix)
5. The two styles are blended together on your layer

**Benefits:**
- Create unique hybrid effects
- Combine complementary styles
- Fine-tune the blend ratio for perfect results
- Endless creative possibilities

**Creative Combinations:**
- Oil + Watercolor (50/50) - Impressionist look
- Comic + Sketch (60/40) - Graphic novel style
- Pastel + Watercolor (70/30) - Soft, dreamy art
- Gouache + Acrylic (50/50) - Bold, modern poster
- Anime + Cartoon (40/60) - Stylized animation

**Blend Ratio Guide:**
- 0.9 = 90% first style, 10% second style
- 0.7 = 70% first style, 30% second style
- 0.5 = Equal mix of both styles
- 0.3 = 30% first style, 70% second style

---

## Future Enhancements

Completed improvements for Photo-to-Paint system:
- ✅ Real-time preview mode (non-destructive)
- ✅ Custom presets for each style
- ✅ Batch processing for multiple layers
- ✅ Style blending/mixing options
- ✅ Additional styles (Pastel, Sketch, Gouache)

Still planned:
- Mask support for selective application (coming soon)

---

## Screen-Wide Eyedropper

### New Feature: Sample Any Color on Your Screen

The eyedropper tool now supports screen-wide color picking in modern browsers!

**How to Use:**
1. Select the Eyedropper tool (press 'I' or click the eyedropper icon)
2. Click anywhere on the canvas OR
3. If your browser supports it (Chrome 95+), the modern color picker will appear
4. Click anywhere on your screen to sample that color
5. The selected color becomes your active painting color

**Browser Support:**
- **Chrome 95+**: Full screen-wide color picking
- **Edge 95+**: Full screen-wide color picking
- **Other browsers**: Canvas-only color picking (fallback mode)

**Benefits:**
- Sample colors from reference images open in other windows
- Pick colors from other applications
- Match colors from anywhere on your screen
- Perfect for color matching and palette creation

**Note:** The browser may ask for permission the first time you use the screen-wide picker.

---

## Examples Gallery

### Before and After

*Coming soon: Screenshots showing examples of each style applied to different types of images*

### Style Comparisons

*Coming soon: Side-by-side comparisons of the same image with different styles*

---

## Related Features

- **Brush System**: Use natural media brushes for manual painting
- **Layer System**: Apply filters to individual layers
- **Color System**: Use color wheel and mixer for palette creation
- **Filters**: Combine with other filters for unique effects

---

For more information about ARTemis features, see:
- [README.md](README.md) - Main documentation
- [TOP_10_FEATURES.md](TOP_10_FEATURES.md) - Top professional features
- [BRUSH-ENGINE.md](BRUSH-ENGINE.md) - Brush system details
