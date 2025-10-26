# Contributing to ARTemis

Thank you for your interest in contributing to ARTemis! This document provides guidelines and information for developers who want to contribute to the project.

## Development Setup

### Prerequisites
- Node.js 16 or higher
- npm (comes with Node.js)
- Git
- A code editor (VS Code recommended)

### Getting Started
```bash
# Clone the repository
git clone https://github.com/mllinman/ARTemis.git
cd ARTemis

# Install dependencies
npm install

# Run the application in development mode
npm start
```

## Project Structure

```
ARTemis/
├── src/
│   ├── main.js          # Electron main process
│   ├── renderer.js      # Canvas and UI logic
│   ├── index.html       # Application UI structure
│   └── styles.css       # Dark mode styling
├── package.json         # Project dependencies and scripts
├── README.md           # Main documentation
├── USAGE.md            # User guide
├── FEATURES.md         # Feature comparison
└── CONTRIBUTING.md     # This file
```

## Architecture Overview

### Main Process (`main.js`)
- Handles Electron application lifecycle
- Creates and manages the main window
- Implements application menu
- Handles file system operations (save/load)
- Manages IPC communication with renderer

### Renderer Process (`renderer.js`)
- Core painting engine
- Canvas management
- Tool implementations
- Layer system
- History/undo-redo
- Event handling
- State management

### UI (`index.html` + `styles.css`)
- Modern dark mode interface
- Tool palette
- Settings panel
- Layer panel
- Canvas display area

## Code Style

### JavaScript
- Use ES6+ features (const, let, arrow functions, etc.)
- Use meaningful variable and function names
- Comment complex logic
- Keep functions focused and small
- Use async/await for asynchronous code

### Example:
```javascript
// Good
function calculateBrushSize(pressure) {
    let size = state.brush.size;
    if (state.brush.pressureSize) {
        size = size * (0.3 + pressure * 0.7);
    }
    return size;
}

// Avoid
function calc(p) {
    let s = state.brush.size;
    if (state.brush.pressureSize) s = s * (0.3 + p * 0.7);
    return s;
}
```

### CSS
- Use meaningful class names
- Follow BEM naming convention where appropriate
- Keep specificity low
- Use CSS custom properties for theme values
- Organize rules logically

### HTML
- Use semantic HTML5 elements
- Keep structure clean and logical
- Use data attributes for JavaScript hooks
- Include ARIA labels for accessibility

## State Management

The application uses a centralized state object:

```javascript
const state = {
    canvas: { width, height, zoom, offsetX, offsetY },
    tool: 'brush',
    brush: { size, opacity, hardness, pressureOpacity, pressureSize },
    color: '#000000',
    layers: [],
    activeLayer: null,
    isDrawing: false,
    history: [],
    historyIndex: -1
};
```

**Guidelines:**
- Always update state before UI
- Keep state minimal and normalized
- Use state as single source of truth
- Update UI reactively from state changes

## Adding New Features

### Adding a New Tool

1. Add tool button to HTML:
```html
<button class="tool-btn" data-tool="newtool" title="New Tool">
    <!-- SVG icon -->
</button>
```

2. Implement tool logic in renderer.js:
```javascript
// In canvas events
if (state.tool === 'newtool') {
    handleNewTool(pos.x, pos.y);
}
```

3. Add keyboard shortcut:
```javascript
case 'n':
    selectTool('newtool');
    break;
```

4. Add menu item in main.js:
```javascript
{
    label: 'New Tool',
    accelerator: 'N',
    click: () => { mainWindow.webContents.send('tool-newtool'); }
}
```

### Adding a New Brush Setting

1. Add UI control in HTML:
```html
<div class="setting-group">
    <label>New Setting: <span id="setting-value">50</span></label>
    <input type="range" id="new-setting" min="0" max="100" value="50" class="slider">
</div>
```

2. Add to state:
```javascript
brush: {
    // ... existing settings
    newSetting: 50
}
```

3. Add event listener:
```javascript
const settingSlider = document.getElementById('new-setting');
settingSlider.addEventListener('input', (e) => {
    state.brush.newSetting = parseInt(e.target.value);
    document.getElementById('setting-value').textContent = state.brush.newSetting;
});
```

4. Use in brush engine:
```javascript
function drawDot(x, y, pressure) {
    // Use state.brush.newSetting
}
```

### Adding a Layer Feature

1. Add UI button:
```html
<button class="icon-btn" id="new-feature-btn" title="New Feature">
    <!-- Icon -->
</button>
```

2. Implement feature:
```javascript
document.getElementById('new-feature-btn').addEventListener('click', () => {
    if (state.activeLayer) {
        // Implement feature
        updateLayersList();
        compositeAllLayers();
        saveState();
    }
});
```

## Testing

### Manual Testing Checklist
- [ ] All tools work correctly
- [ ] Pressure sensitivity functions properly
- [ ] Layer operations perform as expected
- [ ] Undo/redo works across all actions
- [ ] File save/load preserves all data
- [ ] Keyboard shortcuts are responsive
- [ ] Zoom and pan work smoothly
- [ ] UI is responsive and updates correctly
- [ ] No console errors during normal operation

### Testing on Different Platforms
- [ ] Windows 10/11
- [ ] macOS (Intel)
- [ ] macOS (Apple Silicon)
- [ ] Linux (Ubuntu/Debian)

### Testing with Different Input Devices
- [ ] Mouse
- [ ] Trackpad
- [ ] Graphics tablet
- [ ] Touchscreen
- [ ] Stylus

## Pull Request Process

1. **Fork the Repository**
   - Create your own fork on GitHub
   - Clone your fork locally

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**
   - Write clean, documented code
   - Follow the code style guidelines
   - Test thoroughly

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "Add feature: description"
   ```

5. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your feature branch
   - Describe your changes clearly
   - Reference any related issues

### Pull Request Guidelines
- Provide a clear description of changes
- Include screenshots for UI changes
- Reference related issues
- Ensure no merge conflicts
- Keep PRs focused on single features
- Update documentation if needed

## Issue Reporting

### Bug Reports
Include:
- Clear description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- System information (OS, Node version)
- Console errors (if any)

### Feature Requests
Include:
- Clear description of the feature
- Use case and motivation
- Examples from other software (if applicable)
- Mockups or diagrams (if helpful)

## Code of Conduct

### Our Standards
- Be respectful and inclusive
- Accept constructive criticism
- Focus on what's best for the community
- Show empathy towards others

### Unacceptable Behavior
- Harassment or discrimination
- Trolling or insulting comments
- Publishing others' private information
- Unprofessional conduct

## Development Tips

### Debugging
- Use DevTools (View > Toggle Developer Tools)
- Console.log for state inspection
- Check Electron documentation for platform issues
- Test with different canvas sizes

### Performance
- Profile with Chrome DevTools
- Minimize DOM manipulations
- Use requestAnimationFrame for smooth animations
- Optimize canvas operations
- Cache computed values

### Best Practices
- Keep functions pure when possible
- Avoid global state mutations
- Use event delegation
- Debounce expensive operations
- Clean up event listeners

## Resources

### Electron Documentation
- [Electron Docs](https://www.electronjs.org/docs)
- [Electron API](https://www.electronjs.org/docs/api)

### Canvas API
- [MDN Canvas Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial)
- [Canvas Performance](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)

### Pointer Events
- [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
- [Pressure Sensitivity](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pressure)

### Git
- [Git Documentation](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)

## Questions?

If you have questions about contributing:
- Check existing issues and discussions
- Review the documentation
- Ask in a new issue with the "question" label

## License

By contributing to ARTemis, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to ARTemis! Every contribution, no matter how small, helps make digital painting better for everyone. 🎨
