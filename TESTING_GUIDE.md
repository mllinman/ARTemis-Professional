# Testing Guide for Recent Fixes

This document provides step-by-step instructions to test the three fixes implemented.

## 1. Testing Crop Tool Undo/Redo

### Canvas Mode Crop Test
1. Open the application (src/index.html)
2. Create a new canvas or use default
3. Add some content on multiple layers (draw, add text, etc.)
4. Note the current canvas dimensions shown in the status bar
5. Select the Crop tool (press 'C' or click crop in toolbar)
6. Ensure "Crop Canvas" mode is selected in the contextual toolbar
7. Draw a crop rectangle on the canvas
8. Release to apply the crop
9. **Verify**: Canvas dimensions change to match the cropped area
10. **Verify**: All layers are cropped
11. Press Ctrl+Z (or click Undo)
12. **Expected Result**: Canvas should return to original dimensions
13. **Expected Result**: All layers should be restored to pre-crop state
14. Press Ctrl+Shift+Z (or click Redo)
15. **Expected Result**: Crop should be re-applied with correct dimensions

### Layer Mode Crop Test
1. Select the Crop tool (press 'C')
2. Select "Crop Layer Only" mode in the contextual toolbar
3. Draw a crop rectangle on the active layer
4. Release to apply
5. **Verify**: Only the active layer content is cropped
6. **Verify**: Canvas dimensions remain unchanged
7. Press Ctrl+Z (Undo)
8. **Expected Result**: Layer content should be restored
9. **Expected Result**: Canvas dimensions should remain the same

### What Was Fixed
- `saveState()` now saves canvas dimensions along with layer data
- `restoreState()` now restores canvas dimensions and resizes canvas elements
- Undo/redo now properly handles canvas size changes from crop operations

---

## 2. Testing Eraser Tool Fix

### Basic Eraser Test
1. Select Brush tool (press 'B')
2. Paint some strokes on the canvas in different colors
3. Select Eraser tool (press 'E')
4. Erase over the painted areas
5. **Expected Result**: Paint should be completely removed, no alpha artifacts
6. **Expected Result**: Erased areas should be transparent (you should see the canvas background or layers below)

### Eraser with Different Settings Test
1. Paint more strokes
2. Select Eraser tool
3. Change brush hardness to 50%
4. Erase - **Expected**: Soft-edged erasing
5. Change opacity to 50%
6. Erase - **Expected**: Partial erasing (semi-transparent)
7. Change flow to 30%
8. Erase with multiple strokes over same area
9. **Expected**: Gradual erasing with each stroke

### Eraser with Different Brush Shapes Test
1. Select Eraser tool
2. In the left panel, change "Brush Tip Shape" to "Square"
3. Erase some content
4. **Expected**: Square-shaped erasing
5. Change to "Star" shape
6. Erase more content
7. **Expected**: Star-shaped erasing

### What Was Fixed
- `commitDrawing()` now properly handles eraser by clearing the layer and copying the erased result
- Previously, eraser was applying `destination-out` twice, causing alpha channel issues
- Eraser now completely removes pixels without leaving artifacts

---

## 3. Testing Text Tool Improvements

### Creating New Text Test
1. Select Text tool (press 'T')
2. **Before clicking**, adjust text properties in the contextual toolbar:
   - Change font to "Georgia"
   - Change size to 48px
   - Click Bold button
   - Click Italic button
3. Click on canvas
4. **Verify**: Prompt shows current text settings (font, size, bold, italic)
5. Enter some text: "Hello World"
6. Click OK
7. **Expected**: Text appears with the selected properties
8. **Expected**: New layer named "Text: Hello World" is created

### Editing Existing Text Test
1. With the text layer still active, click on canvas with Text tool
2. **Expected**: Edit dialog appears with current text
3. **Expected**: Dialog shows current text settings
4. Modify the text to "Hello ARTemis!"
5. Click OK
6. **Expected**: Text updates with new content
7. **Expected**: Layer name updates to "Text: Hello ARTemis!"

### Live Text Property Updates Test (NEW FEATURE!)
1. Create a text layer with some text
2. Select the text layer in the layers panel
3. In the contextual toolbar, change font size to 72px
4. **Expected**: Text automatically re-renders with new size
5. Click Bold button
6. **Expected**: Text automatically becomes bold
7. Change font to "Impact"
8. **Expected**: Text automatically changes font
9. Click alignment buttons (left, center, right)
10. **Expected**: Text alignment updates automatically
11. Press Ctrl+Z to undo if needed
12. **Expected**: Each property change is undoable

### What Was Improved
- Prompt dialogs now show current text settings for better context
- Text property changes in toolbar now automatically apply to active text layer
- Users can now see live updates when changing font, size, bold, italic, alignment
- More intuitive workflow similar to Photoshop/Krita
- Better guidance in prompt messages

---

## Common Issues to Check

### Crop Tool
- ❌ Undo doesn't restore canvas size → **FIXED**
- ✅ Undo restores both layer content and canvas dimensions
- ✅ Redo works correctly after undo

### Eraser Tool
- ❌ Leaves behind alpha artifacts → **FIXED**
- ✅ Completely removes pixels
- ✅ Works with all brush tip shapes
- ✅ Respects opacity and flow settings

### Text Tool
- ❌ Unclear how to change text properties → **IMPROVED**
- ❌ Can't see live updates when changing properties → **FIXED**
- ✅ Prompt shows current settings
- ✅ Properties auto-apply to selected text layer
- ✅ Clear workflow for editing existing text

---

## Notes

- All changes are backwards compatible
- Old history states (pre-fix) will still work with the new restore function
- The eraser fix doesn't affect other tools
- Text improvements don't require changes to HTML/CSS
- All features work in both browser and Electron modes
