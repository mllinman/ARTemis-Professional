# Photo Editing and Manipulation Tools

This document describes the new photo editing and manipulation tools added to ARTemis.

## 🎨 New Tools Overview

ARTemis now includes professional photo editing and manipulation tools inspired by industry-standard applications like Photoshop, GIMP, and Affinity Photo.

### 1. Crop Tool (C)

**Description:** Trim and resize your canvas to focus on specific areas of your artwork.

**How to Use:**
1. Press `C` or select the Crop tool from the toolbar
2. Click and drag to define the crop region
3. A semi-transparent overlay shows the area that will be removed
4. Release the mouse to apply the crop
5. The canvas and all layers are cropped to the selected area

**Features:**
- Visual preview with darkened overlay outside crop area
- White dashed border shows the crop boundary
- Minimum crop size of 10x10 pixels
- Non-destructive until applied
- Undo support

**Menu Location:** Tools → Crop  
**Keyboard Shortcut:** `C`

---

### 2. Clone Stamp Tool (K)

**Description:** Copy pixels from one area and paint them onto another, perfect for removing unwanted objects or duplicating elements.

**How to Use:**
1. Press `K` or select the Clone Stamp tool from the toolbar
2. Hold `Alt` and click to set the source point
3. A notification will confirm the source is set
4. Click and drag to paint with pixels from the source location
5. The source point moves relative to your cursor

**Features:**
- Pressure-sensitive size and opacity (with pen tablets)
- Uses current brush size setting
- Circular brush mask for natural blending
- Real-time cloning as you drag
- Works on the active layer only

**Tips:**
- Use a soft brush (low hardness) for seamless blending
- Set source point near the area you want to clone for best results
- Clone Stamp respects the current brush opacity setting

**Menu Location:** Tools → Clone Stamp  
**Keyboard Shortcut:** `K`

---

### 3. Dodge Tool (O)

**Description:** Lighten specific areas of your image, bringing out highlights and brightening shadows.

**How to Use:**
1. Press `O` or select the Dodge tool from the toolbar
2. Adjust brush size as needed
3. Click and drag over areas you want to lighten
4. Multiple passes increase the lightening effect

**Features:**
- Pressure-sensitive intensity
- Soft brush falloff for natural results
- Exposure control (default 30%)
- Non-destructive brushing (can be undone)
- Works on pixels in the active layer

**Technical Details:**
- Uses a lighten algorithm: `R' = R + (255 - R) * strength`
- Applies to RGB channels individually
- Soft circular brush with distance-based falloff
- Exposure strength affected by pen pressure

**Best Practices:**
- Use low exposure (10-20%) for subtle lighting adjustments
- Build up the effect with multiple light passes
- Works best on midtones and shadows

**Menu Location:** Tools → Dodge (Lighten)  
**Keyboard Shortcut:** `O`

---

### 4. Burn Tool (U)

**Description:** Darken specific areas of your image, deepening shadows and adding depth.

**How to Use:**
1. Press `U` or select the Burn tool from the toolbar
2. Adjust brush size as needed
3. Click and drag over areas you want to darken
4. Multiple passes increase the darkening effect

**Features:**
- Pressure-sensitive intensity
- Soft brush falloff for natural results
- Exposure control (default 30%)
- Non-destructive brushing (can be undone)
- Works on pixels in the active layer

**Technical Details:**
- Uses a darken algorithm: `R' = R - R * strength`
- Applies to RGB channels individually
- Soft circular brush with distance-based falloff
- Exposure strength affected by pen pressure

**Best Practices:**
- Use low exposure (10-20%) for subtle darkening
- Build up the effect with multiple light passes
- Works best on highlights and midtones
- Avoid over-darkening which can lose detail

**Menu Location:** Tools → Burn (Darken)  
**Keyboard Shortcut:** `U`

---

### 5. Sponge Tool (P)

**Description:** Increase or decrease color saturation in specific areas of your image.

**How to Use:**
1. Press `P` or select the Sponge tool from the toolbar
2. Adjust brush size as needed
3. Click and drag over areas to adjust saturation
4. Default mode is "saturate" (increases color intensity)
5. Hold `Shift` to temporarily switch to desaturate mode

**Features:**
- Pressure-sensitive intensity
- Soft brush falloff for natural blending
- Saturation control (default 50%)
- Two modes: Saturate and Desaturate
- Non-destructive brushing (can be undone)

**Technical Details:**
- Calculates grayscale value: `gray = 0.299*R + 0.587*G + 0.114*B`
- Saturate: Increases color distance from gray value
- Desaturate: Decreases color distance toward gray value
- Soft circular brush with distance-based falloff

**Best Practices:**
- Use saturate mode to make colors pop
- Use desaturate mode for subtle color reduction
- Great for drawing attention to specific areas
- Works well for color correction in portraits

**Menu Location:** Tools → Sponge (Saturation)  
**Keyboard Shortcut:** `P`

---

### 6. Flip Horizontal

**Description:** Mirror the active layer horizontally (left-right flip).

**How to Use:**
1. Select the layer you want to flip
2. Go to Image → Flip Horizontal
3. The layer is immediately flipped

**Features:**
- Operates on the active layer only
- Non-destructive (can be undone)
- Preserves layer position and size
- Works with all layer types

**Use Cases:**
- Create mirror symmetry
- Correct orientation issues
- Create variations of designs

**Menu Location:** Image → Flip Horizontal

---

### 7. Flip Vertical

**Description:** Mirror the active layer vertically (top-bottom flip).

**How to Use:**
1. Select the layer you want to flip
2. Go to Image → Flip Vertical
3. The layer is immediately flipped

**Features:**
- Operates on the active layer only
- Non-destructive (can be undone)
- Preserves layer position and size
- Works with all layer types

**Use Cases:**
- Create vertical reflections
- Correct upside-down images
- Create interesting compositions

**Menu Location:** Image → Flip Vertical

---

## 🎛️ Tool Settings

### Common Settings Across Tools

All brush-based tools (Clone, Dodge, Burn, Sponge) share these settings:

**Brush Size:** Adjust in the left panel (1-200 pixels)
- Keyboard shortcuts: `[` to decrease, `]` to increase

**Opacity:** Controls tool strength (1-100%)
- Affects how much the tool modifies the image per application

**Pressure Sensitivity:** Enable for pen tablets
- Size and opacity respond to pen pressure
- Provides natural, expressive control

---

## 🎨 Workflow Examples

### Example 1: Photo Retouching
1. Use **Clone Stamp (K)** to remove blemishes or unwanted objects
2. Use **Dodge Tool (O)** to brighten eyes and highlights
3. Use **Burn Tool (U)** to deepen shadows and add depth
4. Use **Sponge Tool (P)** to enhance or reduce color saturation

### Example 2: Creative Cropping
1. Select **Crop Tool (C)**
2. Drag to select your composition
3. Review the preview with darkened overlay
4. Release to apply the crop
5. All layers are cropped together

### Example 3: Texture Cloning
1. Select **Clone Stamp (K)**
2. Alt+Click on a textured area to set source
3. Paint the texture onto different areas
4. Adjust brush size for detail work

---

## ⌨️ Keyboard Shortcuts Summary

| Tool | Shortcut | Description |
|------|----------|-------------|
| Crop | `C` | Crop canvas to selection |
| Clone Stamp | `K` | Clone pixels from source |
| Clone Source | `Alt + Click` | Set clone stamp source point |
| Dodge | `O` | Lighten areas |
| Burn | `U` | Darken areas |
| Sponge | `P` | Adjust saturation |
| Brush Size Down | `[` | Decrease brush size |
| Brush Size Up | `]` | Increase brush size |
| Undo | `Ctrl+Z` | Undo last action |
| Redo | `Ctrl+Shift+Z` | Redo last undone action |

---

## 🎯 Technical Implementation

### Architecture

All photo editing tools are implemented in `src/renderer.js` with:
- State management for tool-specific parameters
- Canvas event handlers for pointer input
- Real-time preview capabilities
- Undo/redo integration
- Layer-aware processing

### State Structure

```javascript
state.cloneStamp = {
    sourceX: null,
    sourceY: null,
    sourceSet: false
}

state.crop = {
    active: false,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0
}

state.dodgeBurn = {
    exposure: 30,  // percentage
    mode: 'dodge'  // 'dodge' or 'burn'
}

state.sponge = {
    saturation: 50,  // percentage
    mode: 'saturate'  // 'saturate' or 'desaturate'
}
```

### Key Functions

- `startCrop()`, `updateCrop()`, `finishCrop()` - Crop tool logic
- `setCloneSource()`, `applyCloneStamp()` - Clone stamp functionality
- `applyDodge()` - Dodge tool pixel processing
- `applyBurn()` - Burn tool pixel processing
- `applySponge()` - Sponge tool saturation adjustment
- `flipHorizontal()`, `flipVertical()` - Layer transformation

---

## 🔧 Future Enhancements

Planned improvements for photo editing tools:

### High Priority
- [ ] Healing Brush - Content-aware retouching
- [ ] Patch Tool - Larger area content-aware replacement
- [ ] Red-Eye Reduction - Automatic red-eye removal
- [ ] Perspective Crop - Crop with perspective correction

### Medium Priority
- [ ] Liquify Tool - Warp and distort image areas
- [ ] Content-Aware Fill - Intelligent object removal
- [ ] Smart Clone - AI-assisted cloning
- [ ] Adjustable Dodge/Burn ranges (Shadows, Midtones, Highlights)

### Low Priority
- [ ] Color Replacement Tool - Change specific colors
- [ ] Blur/Sharpen Tools - Local blur and sharpening
- [ ] Smudge Tool - Push pixels around
- [ ] Color Sampler - Multiple reference points

---

## 📚 Additional Resources

- **Main Documentation:** See `README.md` for complete feature list
- **Contributing:** See `CONTRIBUTING.md` for development guidelines
- **Quick Reference:** See `QUICK-REFERENCE.md` for shortcuts
- **Implementation Details:** See `IMPLEMENTATION-COMPLETE.md`

---

## 🎉 Summary

ARTemis now includes a complete suite of professional photo editing tools:

✅ **Crop Tool** - Trim and resize canvas  
✅ **Clone Stamp** - Duplicate image areas  
✅ **Dodge Tool** - Lighten selectively  
✅ **Burn Tool** - Darken selectively  
✅ **Sponge Tool** - Adjust saturation  
✅ **Flip Tools** - Mirror layers  

All tools support:
- Pressure sensitivity (with pen tablets)
- Real-time preview
- Undo/redo integration
- Keyboard shortcuts
- Professional-grade quality

**Implementation Date:** January 2025  
**Status:** ✅ COMPLETE - All Tools Ready for Use
