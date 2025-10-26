# Implementation Notes - Recent Changes

## Overview
This document describes the recent improvements made to ARTemis based on user feedback.

## Changes Implemented

### 1. Touchscreen/Pen Pressure Support
**Problem**: Strokes were stopping short and canvas was moving when using pressure-sensitive pens (Wacom/XPPen).

**Solution**: 
- Added pen/stylus detection using `e.pointerType === 'pen'`
- Disabled canvas panning when using pen/stylus, even with Ctrl key pressed
- Prioritizes drawing over panning for pen input devices
- Mouse users can still pan with Ctrl+Click or middle mouse button

**Code Location**: `src/renderer.js` - `setupCanvasEvents()` function

### 2. Color Mode Selection
**Problem**: UI was stuck on color mixer mode, no easy way to switch between color picker modes.

**Solution**:
- Replaced toggle button with radio button selection
- Added four modes: Basic Picker, Color Wheel, Color Mixer, Color Palettes
- Last selected mode is persisted in localStorage
- Sections are shown/hidden based on selected mode
- Removed redundant swatches under color wheel (as requested)

**Code Locations**:
- `src/index.html` - Color Mode radio buttons
- `src/renderer.js` - `setupColorModeSwitch()` function

### 3. Crop Tool Improvements
**Problem**: Crop tool only had one mode - cropping entire canvas.

**Solution**:
- Added crop mode selection: "Crop Canvas" or "Crop Layer Only"
- Canvas mode: crops all layers and resizes document (original behavior)
- Layer mode: crops only the active layer content, canvas size unchanged
- Mode selector added to contextual toolbar when crop tool is active
- Document dimensions properly update when canvas is cropped

**Code Locations**:
- `src/index.html` - Crop mode radio buttons in contextual toolbar
- `src/renderer.js` - Updated `finishCrop()` function with mode handling
- `src/renderer.js` - Added `updateLayerThumbnail()` helper function

### 4. Text Tool Enhancements
**Problem**: Text was added to current layer, making it hard to edit or move later.

**Solution**:
- Text tool now automatically creates a new layer for each text addition
- Layer is named with preview of text content (e.g., "Text: Hello World")
- Text metadata (position, font, size, etc.) is stored on the layer for future enhancements
- Supports future implementation of moveable/editable text

**Code Location**: `src/renderer.js` - `addText()` function

## Testing Recommendations

### Touchscreen/Pen Testing
1. Use a Wacom or XPPen tablet with pressure-sensitive pen
2. Select brush tool and draw with pen
3. Verify strokes continue smoothly without stopping
4. Verify canvas doesn't pan when Ctrl is held while drawing
5. Verify mouse users can still pan with Ctrl+Click

### Color Mode Testing
1. Open the application
2. Check that "Basic Picker" is selected by default (first time)
3. Switch to "Color Wheel" - verify color wheel appears
4. Switch to "Color Mixer" - verify mixer controls appear
5. Switch to "Color Palettes" - verify palette selector appears
6. Refresh page - verify last selected mode is restored
7. Confirm no swatches appear under color wheel

### Crop Tool Testing
1. Create multiple layers with content
2. Select crop tool
3. With "Crop Canvas" selected:
   - Draw crop rectangle
   - Release to apply
   - Verify all layers are cropped
   - Verify canvas size changes
4. Undo and try with "Crop Layer Only" selected:
   - Draw crop rectangle
   - Release to apply
   - Verify only active layer is cropped
   - Verify canvas size remains unchanged

### Text Tool Testing
1. Select text tool
2. Click on canvas
3. Enter text in prompt
4. Verify new layer is created with text preview in name
5. Verify text appears on canvas
6. Verify layer panel shows new text layer
7. Repeat to add multiple text layers

## Future Enhancements

### Text Tool
The text tool currently stores metadata for future enhancements:
- Interactive text editing dialog box
- Drag-to-reposition text with move tool
- Visual scaling/transformation handles
- Dynamic text field that updates in real-time

These features would require additional UI components and event handling, which can be implemented in a future update based on priority.

## Compatibility Notes
- All changes are backward compatible
- No breaking changes to existing functionality
- localStorage is used for preferences (optional, falls back to defaults)
- Works in both Electron app and standalone browser mode
