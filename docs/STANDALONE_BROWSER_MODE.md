# ARTemis Standalone Browser Mode

## 🌐 Zero Dependencies - Run Anywhere!

ARTemis now works **completely standalone** in any modern web browser without requiring Node.js, npm, or any external dependencies!

## ✨ Quick Start

### Option 1: Direct File Access (Simplest)
1. Download or clone this repository
2. Navigate to the `src` folder
3. **Double-click `index.html`** or drag it into your browser
4. Start painting immediately!

### Option 2: Local Web Server (Recommended for full features)
If you have Python installed:
```bash
# Navigate to the ARTemis directory
cd ARTemis

# Start a simple web server
python3 -m http.server 8080

# Open in browser
# Visit: http://localhost:8080/src/index.html
```

Or with Node.js (if available, but not required):
```bash
npx http-server -p 8080
# Visit: http://localhost:8080/src/index.html
```

## 🎯 What Works in Browser Mode

### ✅ Fully Functional Features
- **All painting tools** - Brush, Eraser, Fill, Eyedropper, Selection, Text, Shapes, Gradient
- **Transform tools** - Move, Rotate, Scale, Crop
- **Photo editing tools** - Clone Stamp, Dodge, Burn, Sponge
- **Layer management** - Create, delete, duplicate, reorder, merge, flatten
- **Filters & effects** - Brightness, Contrast, Blur, Sharpen, Grayscale, Invert
- **100+ brush presets** - All categories fully functional
- **Custom brushes** - Save, export, import brush presets
- **Undo/Redo** - Full 50-state history
- **Zoom & Pan** - Mouse wheel zoom, pan canvas
- **Color picker** - Professional color selection
- **Pressure sensitivity** - Full pen/tablet support
- **Workspace layouts** - Save and load custom layouts
- **All keyboard shortcuts** - Complete shortcut system

### 💾 File Operations

#### Save/Load Projects
- **Chrome/Edge**: Uses modern File System Access API for native-like file dialogs
- **Other Browsers**: Automatic fallback to download/upload files

#### Export Images
- Export to PNG or JPEG
- Works in all browsers using download functionality

#### Import/Export Brushes
- Import brush preset collections
- Export your custom brushes
- Share brushes with others

## 🔧 Browser Compatibility

### Best Experience (File System Access API)
- ✅ **Chrome/Chromium 86+**
- ✅ **Microsoft Edge 86+**
- ✅ **Opera 72+**

### Full Functionality (Download/Upload Fallback)
- ✅ **Firefox** (any recent version)
- ✅ **Safari** (14+)
- ✅ **Mobile browsers** (iOS Safari, Chrome Mobile)

## 📱 Platform Support

Works on **any device** with a modern browser:
- 💻 **Desktop**: Windows, macOS, Linux, ChromeOS
- 📱 **Mobile**: iOS, Android
- 🌐 **Web**: Can be hosted on any web server

## 🚀 Advantages of Browser Mode

### Zero Installation
- No Node.js required
- No npm install needed
- No Electron download (saves ~100+ MB)
- Just open and use!

### Universal Compatibility
- Works on any operating system
- No platform-specific builds needed
- Run from USB drive
- Deploy to web hosting

### Instant Updates
- No reinstallation needed
- Just refresh the page
- Always up-to-date

### Privacy & Security
- All processing happens locally in your browser
- No data sent to servers
- Files stay on your device
- No tracking or analytics

## ⌨️ Keyboard Shortcuts

All keyboard shortcuts work in browser mode!

### File Operations
- `Ctrl/Cmd + N` - New canvas
- `Ctrl/Cmd + Shift + N` - New with size dialog
- `Ctrl/Cmd + S` - Save project
- `Ctrl/Cmd + Shift + S` - Save as
- `Ctrl/Cmd + O` - Open project
- `Ctrl/Cmd + E` - Export image

### Tools
- `B` - Brush
- `E` - Eraser
- `G` - Fill
- `I` - Eyedropper
- `M` - Selection
- `T` - Text
- `S` - Shapes
- `L` - Gradient
- `V` - Move
- `R` - Rotate
- `Z` - Scale
- `C` - Crop
- `K` - Clone Stamp
- `O` - Dodge
- `U` - Burn
- `P` - Sponge

### Edit
- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Shift + Z` - Redo

### View
- `Ctrl/Cmd + =` - Zoom in
- `Ctrl/Cmd + -` - Zoom out
- `Ctrl/Cmd + 0` - Fit to screen
- `Ctrl/Cmd + Mouse Wheel` - Zoom
- `Middle Mouse` or `Ctrl + Left Mouse` - Pan

### Layers
- `Ctrl/Cmd + Shift + L` - New layer
- `Ctrl/Cmd + J` - Duplicate layer
- `Delete` - Delete layer
- `Ctrl/Cmd + ]` - Move layer up
- `Ctrl/Cmd + [` - Move layer down
- `Ctrl/Cmd + E` - Merge layer down
- `Ctrl/Cmd + Shift + E` - Flatten all layers

### Workspace
- `Ctrl/Cmd + Shift + W` - Save workspace
- `Ctrl/Cmd + Alt + W` - Load workspace

### Other
- `[` - Decrease brush size
- `]` - Increase brush size
- `Escape` - Clear selection

## 🎨 Usage Tips

### Getting Started
1. Open `src/index.html` in your browser
2. Select a tool from the toolbar
3. Start painting on the canvas
4. Use layers panel to organize your work
5. Save your project with `Ctrl+S`
6. Export final image with `Ctrl+E`

### Saving Your Work
- **Chrome/Edge**: Click save and choose location directly
- **Other Browsers**: File will download to your Downloads folder
- Rename and organize files as needed
- Projects are saved in `.artemis` format (JSON)

### Loading Projects
- **Chrome/Edge**: Native file picker opens
- **Other Browsers**: Click to browse and upload file
- All project data loads from the file

### Performance Tips
- Use reasonable canvas sizes for better performance
- Merge layers when you don't need them separate
- Clear undo history periodically (save and reload)
- Use hardness and flow settings to reduce brush complexity

## 🔒 Privacy & Data

### Local Processing
- All image processing happens in your browser
- No server communication required
- No data collection or tracking
- Your artwork stays on your device

### Browser Storage
- Custom brush presets saved in localStorage
- Workspace layouts saved in localStorage
- Can be cleared via browser settings
- Export brushes to save externally

## 🆚 Browser Mode vs Desktop Mode

### Browser Mode (Standalone)
✅ Zero dependencies
✅ Works anywhere
✅ No installation
✅ Instant access
✅ Cross-platform by default
⚠️ File dialogs vary by browser
⚠️ Download/upload for some browsers

### Desktop Mode (Electron - Optional)
✅ Native OS file dialogs
✅ Desktop application window
✅ Consistent experience
✅ OS menu integration
❌ Requires Node.js & npm
❌ Requires installation
❌ Larger download size

**Both modes have identical features and functionality!**

## 🤝 Sharing Your Work

### Export Options
1. **PNG** - Lossless, supports transparency
2. **JPEG** - Smaller file size, no transparency

### Sharing Brushes
1. Create custom brushes
2. Export brush presets (`Export` button)
3. Share the JSON file with others
4. Others can import with `Import` button

### Hosting Your Own Instance
You can host ARTemis on any web server:
1. Upload entire repository to web hosting
2. Point users to `src/index.html`
3. Everyone can use it without installation!

## 🐛 Troubleshooting

### App Won't Load
- Ensure JavaScript is enabled in browser
- Try a different browser (Chrome/Edge recommended)
- Check browser console for errors (F12)
- Clear browser cache and reload

### File Operations Not Working
- **Chrome/Edge**: Grant file system permissions when prompted
- **Other Browsers**: Files download/upload instead (this is normal)
- Check browser's download settings
- Ensure pop-ups are not blocked

### Performance Issues
- Use smaller canvas sizes
- Reduce number of layers
- Lower brush complexity (spacing, smoothing)
- Close other browser tabs
- Use hardware acceleration (check browser settings)

### Pen/Tablet Not Working
- Ensure browser supports Pointer Events API
- Update browser to latest version
- Check tablet driver settings
- Test with different pressure levels

## 📚 Additional Resources

- **README.md** - Full feature list and documentation
- **CONTRIBUTING.md** - Developer guide
- **USAGE.md** - Detailed user guide
- **GitHub Repository** - Source code and updates

## 🎉 Conclusion

ARTemis's standalone browser mode makes professional digital painting accessible to everyone, everywhere, without any dependencies or installation. Just open and create!

**Download ARTemis once, use it forever, on any device, anywhere!**
