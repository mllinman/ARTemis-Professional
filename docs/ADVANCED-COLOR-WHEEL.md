# Advanced Color Wheel - Coolorus 2.5-Style Color Picker

ARTemis now features a professional-grade advanced color wheel inspired by Coolorus 2.5, providing a more efficient and feature-rich color-picking experience for digital artists.

## Features

### 🎨 Foreground/Background Color Management
- **Large Color Swatches**: Visual display of foreground (primary) and background (secondary) colors
- **Swap Colors**: Quick swap button with keyboard shortcut (X)
- **Reset to Defaults**: One-click reset to black/white (D key)
- **Click to Edit**: Direct swatch clicking for color selection

### 🌈 Multiple Color Spaces
Support for 5 professional color spaces:
- **HSV** (Hue, Saturation, Value) - Default, best for digital painting
- **HSL** (Hue, Saturation, Lightness) - Alternative luminance model
- **RGB** (Red, Green, Blue) - Direct RGB manipulation
- **LAB** (Lightness, A, B) - Perceptually uniform color space
- **CMYK** (Cyan, Magenta, Yellow, Key) - Print-oriented color space

### 🎯 Interactive Color Wheel
- **280x280px high-resolution wheel** with smooth gradients
- **Click and drag** to pick colors in real-time
- **Visual crosshair** indicator showing current selection
- **Brightness control** via Value slider affects the entire wheel

### 📊 Real-Time Adjustment Sliders
Three intelligent sliders with visual gradient backgrounds:

1. **Hue Slider** (0-360°)
   - Full rainbow gradient display
   - Fine-tune color tone

2. **Saturation Slider** (0-100%)
   - Gray to full color gradient
   - Updates based on current hue
   - Control color intensity

3. **Value/Brightness Slider** (0-100%)
   - Black to current color gradient
   - Updates based on hue and saturation
   - Control color brightness

All sliders update the color wheel in real-time as you adjust them!

### 🔒 Gamut Lock
Constrain color selection to specific ranges:
- **Enable/Disable** with checkbox
- **Hue Range**: Limit to specific color angles (0-360°)
- **Saturation Range**: Control color intensity bounds (0-100%)
- **Value Range**: Limit brightness levels (0-100%)
- **Visual Indicator**: White arc on color wheel shows locked range

Perfect for:
- Maintaining color harmony in artwork
- Restricting palette to specific themes
- Educational purposes
- Color scheme development

### 🕐 Color History
- **Recent Colors Grid**: Last 20 colors used
- **One-click selection**: Click any history swatch to reuse
- **Automatic tracking**: No manual saving needed
- **Persistent across sessions**: Stored in browser localStorage

### 🎨 Palette Management
Professional palette organization system:

#### Create & Organize
- **Multiple Palettes**: Create unlimited named palettes
- **Palette Selector**: Dropdown to switch between palettes
- **Add Current Color**: Save any color to active palette
- **Clear Palette**: Remove all colors from palette

#### Import/Export
- **Save Palette**: Export as JSON file for backup/sharing
- **Load Palette**: Import previously saved palettes
- **Persistent Storage**: All palettes saved in browser localStorage

#### Usage
- **Visual Grid**: 8-column swatch display
- **Click to Apply**: Select any palette color
- **Right-click to Remove**: Context menu for color removal

### ⌨️ Keyboard Shortcuts
- **X**: Swap foreground/background colors
- **D**: Reset colors to default (black/white)

## How to Use

### Activating Advanced Color Wheel
1. Open the **Tools** panel (left sidebar)
2. Expand the **Color** section
3. Under **Color Mode**, select:
   - 🎨 **Advanced Color Wheel (Coolorus-style)**

### Picking Colors

#### Using the Wheel
1. Click or drag on the color wheel to select hue and saturation
2. Adjust the **Value** slider to control brightness
3. Color updates in real-time

#### Using Sliders
1. Drag the **Hue** slider for different color tones (0-360°)
2. Adjust **Saturation** for color intensity (0-100%)
3. Modify **Value** for brightness (0-100%)

#### Switching Color Spaces
1. Click any of the color space tabs: **HSV**, **HSL**, **RGB**, **LAB**, **CMYK**
2. Sliders update to match selected color space
3. Color wheel display adjusts accordingly

### Using Gamut Lock

#### Setting Up Restrictions
1. Enable **Gamut Lock** checkbox
2. Set ranges for Hue, Saturation, and Value:
   - Enter minimum value in left field
   - Enter maximum value in right field
3. Color wheel shows only colors within range

#### Example Use Cases
- **Warm colors only**: Hue 0-60° (reds, oranges, yellows)
- **Cool colors only**: Hue 180-270° (blues, greens, cyans)
- **Muted palette**: Saturation 0-50%
- **High contrast**: Value 0-30% or 70-100%

### Managing Palettes

#### Creating a New Palette
1. Click the **+** button next to palette selector
2. Enter a name for your palette
3. New palette becomes active

#### Adding Colors
1. Select desired color using wheel/sliders
2. Click **Add Current Color** button
3. Color appears in palette grid

#### Saving/Loading
1. Click **💾** (Save) button to export as JSON
2. Click **📂** (Load) button to import palette file
3. Files can be shared with others or backed up

#### Removing Colors
1. Right-click any color swatch in palette
2. Confirm removal
3. Color is deleted from palette

## Technical Details

### Color Conversion
All color space conversions are handled accurately:
- HSV ↔ RGB (primary conversion)
- HSL ↔ RGB
- LAB color space support
- CMYK calculations

### Performance
- **Efficient rendering**: Canvas-based color wheel
- **Smooth interactions**: Optimized event handling
- **Minimal memory**: Lazy loading and cleanup

### Browser Compatibility
- Modern browsers with Canvas API support
- HTML5 localStorage for persistence
- No external dependencies

### Integration
The advanced color wheel integrates seamlessly with ARTemis:
- Updates main application color picker
- Syncs with brush color
- Compatible with all painting tools
- Works alongside existing color features

## Comparison to Standard Color Wheel

| Feature | Standard Wheel | Advanced Wheel |
|---------|---------------|----------------|
| Color Spaces | HSV only | HSV, HSL, RGB, LAB, CMYK |
| FG/BG Swatches | No | Yes |
| Gamut Lock | No | Yes |
| Visual Sliders | Basic | Gradient backgrounds |
| Palettes | Separate section | Integrated |
| Color History | No | Yes (20 colors) |
| Export/Import | No | Yes |
| Keyboard Shortcuts | No | Yes |

## Tips & Tricks

### For Digital Painters
1. Use **HSV mode** for intuitive color selection
2. Enable **Gamut Lock** to maintain consistent color themes
3. Create palettes for different lighting conditions
4. Use **Color History** to reference previously used colors

### For Designers
1. Switch to **LAB mode** for perceptually uniform adjustments
2. Use **CMYK mode** when preparing for print
3. Create and share palette files for brand colors
4. Use Gamut Lock to explore color variations within a theme

### For Speed
1. Learn keyboard shortcuts (X to swap, D to reset)
2. Create quick-access palettes for common colors
3. Use Color History for rapid color switching
4. Drag on wheel for continuous color changes

## Future Enhancements

Potential features for future versions:
- Color harmony indicators (complementary, triadic, etc.)
- Color temperature adjustment
- Gradient generation from palette
- More color space options (XYZ, LCH)
- Advanced gamut visualization
- Palette sharing community features

## Credits

Inspired by Coolorus 2.5's efficient color-picking workflow, adapted and enhanced for ARTemis Professional with additional features for digital artists.

---

**Need help?** Check the main [ARTemis documentation](README.md) or visit our [community forums](#).
