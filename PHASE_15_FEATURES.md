# Phase 15: Performance & Export Features

## Overview

Phase 15 introduces advanced export capabilities and performance monitoring tools to ARTemis, providing professional-grade export options and better memory management for large projects.

---

## ✨ New Features

### 1. Advanced Export Dialog

Access via: **File → Advanced Export... (Ctrl+Shift+E)**

The Advanced Export dialog provides fine-grained control over how your artwork is exported:

#### Export Source Options
- **Entire Canvas (All Layers Flattened)** - Export the complete composition as seen
- **Current Layer Only** - Export just the active layer
- **All Visible Layers** - Export only visible layers, merged together
- **Selected Layers** - Choose specific layers to export merged
- **Batch Export** - Export each selected layer as a separate file

#### Format Options
- **PNG** - Lossless format with transparency support
- **JPEG** - Best for photographs, no transparency (adjustable quality)
- **WebP** - Modern format with excellent compression (adjustable quality)

#### Web Optimization Features
- **Resize on Export** - Scale your image to specific dimensions
- **Maintain Aspect Ratio** - Lock proportions when resizing
- **Format Recommendations** - Smart suggestions based on your settings
- **Size Estimates** - See estimated file size before exporting

#### Export Presets
Five built-in presets for common use cases:
- **Web Standard** - 1920x1080, PNG (full quality)
- **Web Optimized** - 1920x1080, WebP 90% (balanced size/quality)
- **Social Media** - 1200x1200, JPEG 85% (optimized for social platforms)
- **Print Quality** - Full size, PNG (maximum quality)
- **Thumbnail** - 400x400, JPEG 80% (small preview size)

**Save Custom Presets:** Create and save your own export configurations for repeated use.

---

### 2. Memory Monitor & Management

Access via: **File → Memory Monitor...**

The Memory Monitor provides real-time insights into your application's memory usage and tools to optimize performance:

#### Memory Statistics
- **Canvas Memory** - Memory used by the main canvas
- **Layer Count** - Total number of layers in your project
- **History States** - Number of undo/redo states stored
- **Estimated Total** - Total memory usage estimate

#### Performance Settings
- **Enable Automatic Memory Cleanup** - Automatically manage memory usage
- **Max History States** - Configure undo/redo history limit (10-100 states)
  - Default: 50 states
  - Reducing this frees up memory for larger projects

#### Cleanup Actions
- **Clear Undo History** - Remove all undo/redo states (keeps current state)
- **Regenerate Layer Thumbnails** - Refresh layer preview thumbnails
- **Force Garbage Collection** - Request browser memory cleanup (when available)

---

## 🎯 Use Cases

### Exporting for the Web
1. Open **Advanced Export** dialog
2. Select **Web Optimized** preset
3. Adjust dimensions if needed
4. Click **Export**

Result: Optimally compressed image perfect for websites

### Batch Exporting Layers
1. Open **Advanced Export** dialog
2. Select **Batch Export** option
3. Check the layers you want to export
4. Choose format and settings
5. Click **Export**

Result: Each layer exported as a separate file

### Managing Large Projects
1. Open **Memory Monitor** dialog
2. Review memory statistics
3. Adjust **Max History States** if needed
4. Use **Clear Undo History** to free memory
5. Enable **Automatic Memory Cleanup**

Result: Better performance with large canvases and many layers

### Creating Export Presets
1. Open **Advanced Export** dialog
2. Configure your desired settings
3. Click **Save Preset**
4. Enter a name for your preset
5. Select it from the dropdown next time

Result: Quick access to your favorite export configurations

---

## 📊 Technical Details

### Memory Usage Calculations
- **Canvas Memory** = Width × Height × 4 bytes (RGBA)
- **Layer Memory** = Canvas Memory × Number of Layers
- **History Memory** = Canvas Memory × Number of History States
- **Total Memory** = Layer Memory + History Memory

### Export Size Estimates
Approximate file sizes based on format:
- **PNG:** ~50% of raw RGBA data (lossless compression)
- **JPEG:** ~15% of raw data × (quality / 100)
- **WebP:** ~12% of raw data × (quality / 100)

### Image Quality Recommendations
- **Print/Professional:** PNG or JPEG 95-100%
- **Web Standard:** PNG or JPEG 90-95%
- **Web Optimized:** WebP 85-90%
- **Social Media:** JPEG 80-85%
- **Thumbnails:** JPEG 70-80%

---

## ⌨️ Keyboard Shortcuts

- **Ctrl+Shift+E** - Open Advanced Export dialog
- **Ctrl+E** - Quick export (standard dialog)

---

## 💡 Tips & Best Practices

### Export Tips
1. **Use WebP for web** - Smaller file sizes with excellent quality
2. **Batch export for animations** - Export layers as frames
3. **Create presets** - Save time on repeated export tasks
4. **Check estimates** - Preview file size before exporting

### Performance Tips
1. **Monitor memory regularly** - Keep an eye on large projects
2. **Limit history states** - Reduce to 20-30 for huge canvases
3. **Clear history periodically** - Free up memory during long sessions
4. **Use visible layers export** - Skip hidden layers to save memory

### Quality vs. Size Trade-offs
- For web: 85-90% quality is usually indistinguishable from 100%
- For print: Always use PNG or JPEG 95-100%
- For social media: Follow platform recommendations (usually 80-85%)

---

## 🔧 Troubleshooting

### Issue: Export dialog not showing
**Solution:** Ensure you're not in the middle of a tool operation. Try clicking away from the canvas first.

### Issue: Batch export creates too many files
**Solution:** Uncheck layers you don't want to export in the layer selection list.

### Issue: Memory monitor shows high usage
**Solution:** 
1. Clear undo history
2. Reduce max history states
3. Close and reopen the application
4. Consider flattening some layers

### Issue: Export quality seems low
**Solution:**
1. Increase quality slider (for JPEG/WebP)
2. Use PNG for maximum quality
3. Disable resize if not needed
4. Check if you're exporting the right layers

---

## 📝 Phase 15 Enhancements - COMPLETED ✅

All Phase 15 future enhancements have been implemented:
- **WebGL Acceleration** ✅ - GPU-accelerated rendering for faster brush strokes (experimental, can be enabled in settings)
- **Larger Canvas Support** ✅ - 4K+ canvases with tiled rendering to manage memory efficiently
- **PSD Export** ✅ - Full layer preservation in Photoshop format using ag-psd library
- **TIFF Support** ✅ - Professional-grade TIFF export using UTIF library
- **Progressive Loading** ✅ - Load and display large images incrementally with progress indication

### How to Use New Features

#### PSD Export with Layers
1. Create artwork with multiple layers
2. Go to **File → Export Image**
3. Choose `.psd` format
4. All layers, blend modes, and opacity settings are preserved

#### TIFF Export
1. Go to **File → Export Image**
2. Choose `.tiff` or `.tif` format
3. Professional-grade TIFF file is created

#### Progressive Loading
- Automatically enabled when importing large images
- Shows loading progress for better user experience

#### WebGL Acceleration (Experimental)
1. Go to **File → Settings**
2. Enable "WebGL Acceleration" in Performance & Rendering section
3. Faster brush strokes with GPU acceleration

#### Tiled Rendering for 4K+ Canvases
1. Automatically enabled for canvases larger than 4K (3840x2160)
2. Can be manually controlled in Settings
3. Reduces memory usage for large canvases

---

## 📚 Related Documentation

- [FUTURE_ENHANCEMENTS.md](FUTURE_ENHANCEMENTS.md) - Complete roadmap
- [README.md](README.md) - Main application documentation
- [USAGE.md](USAGE.md) - General usage guide

---

**Last Updated:** October 2025  
**Version:** Phase 15 Implementation  
**Status:** ✅ Completed (Export Enhancements & Memory Management)
