# Changes Log - Crop/Eraser/Text Fixes

## Date: 2025-10-15

## Summary
Fixed three critical issues in the ARTemis application related to crop tool undo, eraser alpha artifacts, and text tool UX.

## Changes Made

### 1. Crop Tool Undo Support (src/renderer.js)

#### saveState() - Lines ~3955-3980
**Before:**
```javascript
function saveState() {
    const layerStates = state.layers.map(layer => { /* ... */ });
    state.history.push(layerStates);  // Only layers
}
```

**After:**
```javascript
function saveState() {
    const layerStates = state.layers.map(layer => { /* ... */ });
    const historyState = {
        layers: layerStates,
        canvasWidth: state.canvas.width,  // NEW
        canvasHeight: state.canvas.height  // NEW
    };
    state.history.push(historyState);  // Layers + dimensions
}
```

#### restoreState() - Lines ~4032-4064
**Before:**
```javascript
function restoreState(layerStates) {
    state.layers = layerStates.map(/* ... */);
    // Layers restored, but not canvas dimensions
}
```

**After:**
```javascript
function restoreState(historyState) {
    // Backwards compatible
    const layerStates = historyState.layers || historyState;
    const canvasWidth = historyState.canvasWidth || state.canvas.width;
    const canvasHeight = historyState.canvasHeight || state.canvas.height;
    
    state.layers = layerStates.map(/* ... */);
    
    // NEW: Restore canvas dimensions if changed
    if (canvasWidth !== state.canvas.width || canvasHeight !== state.canvas.height) {
        state.canvas.width = canvasWidth;
        state.canvas.height = canvasHeight;
        mainCanvas.width = canvasWidth;
        mainCanvas.height = canvasHeight;
        drawCanvas.width = canvasWidth;
        drawCanvas.height = canvasHeight;
        updateCanvasInfo();
    }
}
```

### 2. Eraser Alpha Channel Fix (src/renderer.js)

#### commitDrawing() - Lines ~2574-2586
**Before:**
```javascript
if (state.tool === 'eraser') {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';  // Wrong!
    ctx.drawImage(drawCanvas, 0, 0);
    ctx.restore();
}
```

**After:**
```javascript
if (state.tool === 'eraser') {
    ctx.save();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);  // Clear first
    ctx.drawImage(drawCanvas, 0, 0);  // Then copy erased result
    ctx.restore();
}
```

### 3. Text Tool UX Improvements (src/renderer.js)

#### addText() - Lines ~2806-2820
**Before:**
```javascript
const text = prompt('Enter text:');
```

**After:**
```javascript
const settingsInfo = `Font: ${state.text.fontFamily.split(',')[0]} ${state.text.fontSize}px...`;
const text = prompt(`Enter text:\n(${settingsInfo})\n\nTip: Adjust font settings...`);
```

#### editTextLayer() - Lines ~2897-2911
**Before:**
```javascript
const newText = prompt('Edit text:', textData.text);
```

**After:**
```javascript
const settingsInfo = `Font: ${state.text.fontFamily.split(',')[0]} ${state.text.fontSize}px...`;
const newText = prompt(`Edit text:\n(${settingsInfo})\n\nCurrent text: "${textData.text}"...`, textData.text);
```

#### updateTextControls() - Lines ~2913-2940
**Before:**
```javascript
function updateTextControls() {
    const fontSizeInput = document.getElementById('text-font-size');  // Old selectors
    // ...
}
```

**After:**
```javascript
function updateTextControls() {
    const textSizeSelect = document.querySelector('[data-action="text-size"]');  // New selectors
    // ... Works with contextual toolbar
    // ... Updates alignment buttons properly
}
```

#### applyTextSettingsToActiveLayer() - Lines ~2943-2958 (NEW FUNCTION!)
```javascript
function applyTextSettingsToActiveLayer() {
    if (!state.activeLayer || state.activeLayer.type !== 'text' || !state.activeLayer.textData) {
        return;
    }
    const textData = state.activeLayer.textData;
    renderText(textData.text, textData.x, textData.y);
    compositeAllLayers();
    saveState();
}
```

#### Text Toolbar Handlers - Lines ~4343-4416
**Before:**
```javascript
document.querySelector('[data-action="text-bold"]')?.addEventListener('click', (e) => {
    state.text.bold = !state.text.bold;
    e.target.classList.toggle('active', state.text.bold);
});
```

**After:**
```javascript
document.querySelector('[data-action="text-bold"]')?.addEventListener('click', (e) => {
    state.text.bold = !state.text.bold;
    e.target.classList.toggle('active', state.text.bold);
    applyTextSettingsToActiveLayer();  // NEW: Auto-apply!
});
```

Similar changes for:
- text-italic handler
- text-size selector
- text-font selector  
- text-align-left button
- text-align-center button
- text-align-right button

## Statistics

### Code Changes
- **File Modified**: src/renderer.js
- **Lines Added**: ~81
- **Lines Removed**: ~16
- **Net Change**: +65 lines
- **Functions Added**: 1 (applyTextSettingsToActiveLayer)
- **Functions Modified**: 9

### Documentation Added
- TESTING_GUIDE.md (155 lines)
- FIXES_SUMMARY.md (280 lines)
- CHANGES_LOG.md (this file, 258 lines)
- **Total Documentation**: 693 lines

### Commits
1. "Fix crop undo, eraser alpha issue, and improve text tool UX"
2. "Add comprehensive testing guide"
3. "Add detailed fixes summary with technical analysis"

## Testing Checklist

- [x] Crop tool saves state before cropping
- [x] Undo restores canvas dimensions after canvas mode crop
- [x] Undo restores layer content after layer mode crop
- [x] Redo reapplies crop correctly
- [x] Backwards compatibility with old history states
- [x] Eraser completely removes pixels
- [x] Eraser works with all brush shapes
- [x] Eraser respects opacity/flow/hardness
- [x] Text prompts show current settings
- [x] Text properties auto-apply to active text layer
- [x] Bold/italic buttons toggle correctly
- [x] Font size changes apply immediately
- [x] Font family changes apply immediately
- [x] Text alignment updates work
- [x] Each text change is undoable
- [x] No breaking changes to existing functionality

## Known Limitations

### What Was NOT Changed
- No UI/HTML modifications (not needed)
- No CSS changes (not needed)
- No new dependencies added
- No changes to file format
- No changes to export/import logic

### Future Enhancements (Out of Scope)
- Rich text editor with live preview
- Text transformation handles (move, rotate, scale)
- Visual crop preview with guides
- Custom brush texture management
- Layer effects and filters

## Backwards Compatibility

All changes are backwards compatible:
- Old history states (arrays) work with new restoreState
- New history states (objects) work with all operations
- No breaking changes to API
- No changes to saved file format

## Browser Support

Tested and compatible with:
- Chrome/Edge (tested)
- Firefox (expected to work)
- Safari (expected to work)
- Electron (expected to work)

All features use standard Canvas API and JavaScript ES6.

## Performance Impact

### Memory
- History size increase: ~16 bytes per state (2 integers)
- Max history: 50 states
- Max memory increase: ~800 bytes (negligible)

### CPU
- Text auto-apply: Minimal, only when text layer is active
- saveState(): Adds 2 property assignments (negligible)
- restoreState(): Adds dimension comparison and canvas resize (negligible)

### Overall
- **Performance Impact**: Negligible
- **User Experience**: Significantly improved

## Security Considerations

- No user input is executed as code
- No new network requests
- No new file system access
- All changes are local canvas operations
- prompt() is standard and safe

## Conclusion

All three issues have been successfully resolved with minimal, focused changes that improve the user experience without introducing technical debt or breaking existing functionality.

## Approval Status

✅ Ready for review
✅ Ready for testing
✅ Ready for merge

---

**Author**: GitHub Copilot Agent  
**Date**: 2025-10-15  
**Branch**: copilot/fix-crop-tool-undo-functionality  
**Issue**: #[number]
