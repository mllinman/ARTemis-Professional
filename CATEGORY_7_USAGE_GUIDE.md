# Category 7 Usage Guide
## Quick Start Guide for Vector & Typography Tools

This guide provides practical examples and usage patterns for all Category 7 features implemented in ARTemis.

---

## 🔷 Advanced Vector Tools

### 1. Compound Paths - Creating Shapes with Holes

**Use Case:** Create a donut shape, logo with cutouts, or complex icons.

```javascript
// Import the class
const { CompoundPath, VectorPath } = require('./src/vector-tools.js');

// Create outer circle
const outer = new VectorPath();
for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    outer.addPoint(
        200 + Math.cos(angle) * 100,
        200 + Math.sin(angle) * 100,
        'smooth'
    );
}
outer.closed = true;

// Create inner circle (hole)
const inner = new VectorPath();
for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    inner.addPoint(
        200 + Math.cos(angle) * 50,
        200 + Math.sin(angle) * 50,
        'smooth'
    );
}
inner.closed = true;

// Combine into compound path
const donut = new CompoundPath();
donut.addPath(outer, 'positive');
donut.createHole(inner);

// Draw
donut.draw(ctx, '#4A90E2', '#2868A8', 3);
```

**Tips:**
- Use 'evenodd' fill rule (default) for standard holes
- Use 'nonzero' for complex overlapping shapes
- Can add multiple holes with multiple `createHole()` calls

---

### 2. Path Simplification - Optimizing Vector Artwork

**Use Case:** Reduce file size of traced images or complex drawings.

```javascript
const { PathSimplifier } = require('./src/vector-tools.js');

// Start with a complex path
const complexPath = loadComplexPath(); // Your path with many points

// Simplify with low tolerance (more aggressive)
const simplified = PathSimplifier.simplify(complexPath, 5);
console.log(`Reduced from ${complexPath.points.length} to ${simplified.points.length} points`);

// Smooth the result
const smoothed = PathSimplifier.smoothCurves(simplified, 0.7);

// Draw comparison
complexPath.draw(ctx, null, 'lightgray', 1);
smoothed.draw(ctx, null, '#4A90E2', 2);
```

**Tips:**
- Lower tolerance = more aggressive simplification
- Start with tolerance 10-20 for balanced results
- Use `smoothCurves()` after simplification for better appearance
- Save original before simplifying (use `clone()`)

---

### 3. Path Offset - Creating Parallel Paths

**Use Case:** Create stroke outlines, padding around shapes, or concentric designs.

```javascript
const { PathOffset } = require('./src/vector-tools.js');

// Original shape
const shape = createMyShape();

// Create outset (expand)
const outer = PathOffset.outset(shape, 20, true);

// Create inset (shrink)
const inner = PathOffset.inset(shape, 15, true);

// Create multiple concentric rings
const rings = PathOffset.multipleOffset(shape, 10, 5);
rings.forEach((ring, i) => {
    const opacity = 1 - (i * 0.15);
    ring.draw(ctx, null, `rgba(74, 144, 226, ${opacity})`, 2);
});
```

**Tips:**
- Use `roundedCorners: true` for smooth offset paths
- Use `roundedCorners: false` for sharp corners (faster)
- Negative distances create insets, positive create outsets
- Multiple offsets perfect for ripple effects

---

### 4. Path Blend/Morph - Shape Animation

**Use Case:** Create smooth transitions between shapes for animations.

```javascript
const { PathMorph } = require('./src/vector-tools.js');

// Define start and end shapes
const startShape = createSquare(100, 100, 100);
const endShape = createCircle(150, 150, 50);

// Single blend
const midShape = PathMorph.blend(startShape, endShape, 0.5);
midShape.draw(ctx);

// Animation sequence
const frames = PathMorph.createSteps(startShape, endShape, 30);

// Animate
let frameIndex = 0;
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frames[frameIndex].draw(ctx, 'rgba(74, 144, 226, 0.3)', '#4A90E2', 3);
    frameIndex = (frameIndex + 1) % frames.length;
    requestAnimationFrame(animate);
}
animate();
```

**Tips:**
- Shapes with different point counts are automatically normalized
- Use more steps (30-60) for smoother animations
- Blend value 0 = first shape, 1 = second shape, 0.5 = halfway
- Great for UI transitions and morphing logos

---

### 5. Live Corners - Dynamic Corner Styles

**Use Case:** Apply professional corner treatments to shapes.

```javascript
const { LiveCorners } = require('./src/vector-tools.js');

// Original sharp-cornered shape
const rectangle = createRectangle(100, 100, 300, 200);

// Round all corners
const rounded = LiveCorners.applyCorners(rectangle, 20, 'round');

// Inverse corners (concave)
const inverse = LiveCorners.applyCorners(rectangle, 15, 'inverse');

// Chamfer (cut) corners
const chamfered = LiveCorners.applyCorners(rectangle, 20, 'chamfer');

// Per-corner control (different style per corner)
const mixed = LiveCorners.applyPerCorner(rectangle, [
    { index: 0, radius: 30, type: 'round' },
    { index: 1, radius: 20, type: 'inverse' },
    { index: 2, radius: 25, type: 'chamfer' },
    { index: 3, radius: 15, type: 'round' }
]);
```

**Types:**
- **Round:** Classic rounded corners (most common)
- **Inverse:** Concave/scooped corners (decorative)
- **Chamfer:** Straight-cut corners (technical drawings)

---

## ✒️ Typography Enhancements

### 6. OpenType Features - Professional Typography

**Use Case:** Enable advanced font features for refined typography.

```javascript
const { OpenTypeFeatures } = require('./src/vector-tools.js');

// Create feature controller
const opentype = new OpenTypeFeatures();

// Enable ligatures
opentype.enable('ligatures');

// Enable small caps
opentype.enable('smallCaps');

// Enable fractions
opentype.enable('fractions');

// Apply to DOM element
const textElement = document.getElementById('my-text');
opentype.applyToElement(textElement);

// Or get CSS string
console.log(opentype.getCSSFeatures());
// Output: "liga" 1, "smcp" 1, "frac" 1
```

**Available Features:**
- `ligatures` - ff, fi, fl, ffi, ffl
- `swashes` - Decorative flourishes
- `stylisticAlternates` - Alternative character forms
- `smallCaps` - Small capital letters
- `fractions` - Proper fraction formatting
- `oldstyleNums` - Old-style numerals
- `tabularNums` - Fixed-width numbers

---

### 7. Variable Fonts - Dynamic Font Control

**Use Case:** Animate font weight or create responsive typography.

```javascript
const { VariableFontController } = require('./src/vector-tools.js');

// Initialize with font family
const varFont = new VariableFontController('Inter'); // Use variable font

// Set weight (100-900)
varFont.setWeight(700); // Bold

// Set width (75-125%)
varFont.setWidth(90); // Condensed

// Set slant (-15 to 15 degrees)
varFont.setSlant(-10); // Italic

// Animate between two styles
const lightStyle = new VariableFontController('Inter');
lightStyle.setWeight(300);

const boldStyle = new VariableFontController('Inter');
boldStyle.setWeight(800);

// Interpolate (t from 0 to 1)
varFont.interpolateBetweenStyles(lightStyle, boldStyle, 0.5);

// Apply to context
ctx.font = varFont.applyToContext(ctx);
```

**Use Cases:**
- Hover effects (increase weight on hover)
- Responsive typography (adjust width for narrow screens)
- Animated headlines
- Emphasis without font switching

---

### 8. Text Styles - Style Management

**Use Case:** Maintain consistent formatting across documents.

```javascript
const { TextStyle, TextStyleManager } = require('./src/vector-tools.js');

// Create style manager
const styleManager = new TextStyleManager();

// Create custom style
const headline = new TextStyle('Main Headline', 'paragraph');
headline.fontSize = 48;
headline.fontWeight = 'bold';
headline.color = '#2868A8';
headline.leading = 1.2;
headline.spaceBefore = 20;
headline.spaceAfter = 10;

// Add to manager
styleManager.addStyle(headline);

// Apply style
const style = styleManager.getStyle('Main Headline');
style.apply(ctx);
ctx.fillText('My Headline', 50, 100);

// Update all instances of a style
styleManager.updateAllInstances('Main Headline', {
    fontSize: 52,
    color: '#4A90E2'
});

// Export styles
const json = styleManager.exportStyles();
localStorage.setItem('textStyles', json);

// Import styles
const savedStyles = localStorage.getItem('textStyles');
styleManager.importStyles(savedStyles);
```

**Built-in Styles:**
- `Heading 1` - 32px, bold, extra spacing
- `Heading 2` - 24px, bold, medium spacing
- `Body` - 16px, 1.5 leading

---

### 9. Advanced Text Layout - Professional Typography

**Use Case:** Fine-tune text spacing for professional publications.

```javascript
const { AdvancedTextLayout, TextStyle } = require('./src/vector-tools.js');

// Create style
const style = new TextStyle('Custom', 'paragraph');
style.fontSize = 18;

// Create layout
const layout = new AdvancedTextLayout('Your text here', style);

// Set leading (line spacing)
layout.setLeading(1.6); // 160% of font size

// Set tracking (letter spacing)
layout.setTracking(2); // 2px between all letters

// Custom kerning for specific pairs
layout.setKerningPair('T', 'o', -1); // Tighten "To"
layout.setKerningPair('V', 'A', -2); // Tighten "VA"

// Baseline shift (for superscript/subscript)
layout.setBaselineShift(-5); // Shift down 5px

// Draw
layout.draw(ctx, 50, 100, 400);
```

**Values:**
- **Leading:** 1.0 = tight, 1.2 = normal, 1.5+ = loose
- **Tracking:** Negative = tighter, positive = looser
- **Kerning:** Fine-tune specific letter pairs
- **Baseline Shift:** Positive = up, negative = down

---

### 10. Text Effects - Visual Enhancements

**Use Case:** Create eye-catching titles and headlines.

```javascript
const { TextEffects, TextStyle } = require('./src/vector-tools.js');

// Create base style
const style = new TextStyle('Title', 'paragraph');
style.fontSize = 72;
style.fontWeight = 'bold';
style.color = '#4A90E2';

// Create effects stack
const effects = new TextEffects();

// Add multiple effects (applied in order)
effects.addShadow(4, 4, 8, 'rgba(0, 0, 0, 0.4)');
effects.addOutline('#2868A8', 3);
effects.addGlow('#61dafb', 15);

// Apply all effects
effects.apply(ctx, 'AMAZING', 100, 150, style);

// Create gradient effect
const gradient = ctx.createLinearGradient(0, 100, 400, 150);
gradient.addColorStop(0, '#4A90E2');
gradient.addColorStop(0.5, '#61dafb');
gradient.addColorStop(1, '#90CAF9');

const gradientEffects = new TextEffects();
gradientEffects.addGradient(gradient);
gradientEffects.addOutline('#2868A8', 2);
gradientEffects.apply(ctx, 'GRADIENT', 100, 250, style);

// 3D effect
const threeD = new TextEffects();
threeD.add3DExtrusion(10, Math.PI / 4, 'rgba(0, 0, 0, 0.3)');
threeD.apply(ctx, '3D TEXT', 100, 350, style);
```

**Effect Types:**
- `addOutline(color, width)` - Stroke around text
- `addShadow(x, y, blur, color)` - Drop shadow
- `addGlow(color, size)` - Glowing halo
- `add3DExtrusion(depth, angle, color)` - 3D depth
- `addGradient(gradient)` - Gradient fill
- `addPatternFill(pattern)` - Pattern texture

---

### 11. Text Warping - Creative Distortions

**Use Case:** Create curved logos, wavy titles, or distorted text.

```javascript
const { TextWarping, TextStyle } = require('./src/vector-tools.js');

// Create style
const style = new TextStyle('Warped', 'paragraph');
style.fontSize = 48;
style.fontWeight = 'bold';
style.color = '#4A90E2';

// Arc warp (curved like a rainbow)
TextWarping.drawWarped(ctx, 'CURVED TEXT', 100, 150, 'arc', 0.5, style);

// Wave warp (sinusoidal wave)
TextWarping.drawWarped(ctx, 'WAVE EFFECT', 100, 250, 'wave', 0.6, style);

// Flag warp (waving flag)
TextWarping.drawWarped(ctx, 'WAVING FLAG', 100, 350, 'flag', 0.5, style);

// Fisheye distortion
TextWarping.drawWarped(ctx, 'FISHEYE', 100, 450, 'fisheye', 0.7, style);

// Inflate (bulge in middle)
TextWarping.drawWarped(ctx, 'INFLATE', 100, 550, 'inflate', 0.8, style);

// Squeeze (pinch in middle)
TextWarping.drawWarped(ctx, 'SQUEEZE', 100, 650, 'squeeze', 0.6, style);
```

**Warp Types & Strengths:**
- `arc` (0.3-0.7) - Curved text
- `arch` (0.3-0.7) - Arched bridge
- `wave` (0.4-0.8) - Wavy pattern
- `flag` (0.3-0.6) - Waving flag
- `fisheye` (0.5-0.9) - Lens distortion
- `inflate` (0.5-0.9) - Center expansion
- `squeeze` (0.4-0.7) - Center compression

---

### 12. Glyphs Panel - Character Browser

**Use Case:** Find and insert special characters and symbols.

```javascript
const { GlyphsPanel } = require('./src/vector-tools.js');

// Initialize
const glyphsPanel = new GlyphsPanel('Arial');

// Browse by category
const symbols = glyphsPanel.browseCategory('symbols');
console.log('Symbols:', symbols.slice(0, 10));

const letters = glyphsPanel.browseCategory('letters');
const numbers = glyphsPanel.browseCategory('numbers');
const punctuation = glyphsPanel.browseCategory('punctuation');
const special = glyphsPanel.browseCategory('special');

// Search for glyphs
const hearts = glyphsPanel.searchGlyphs('heart');
console.log('Heart symbols:', hearts);

// Track recently used
glyphsPanel.addToRecent('★');
glyphsPanel.addToRecent('♥');
glyphsPanel.addToRecent('©');

const recent = glyphsPanel.getRecentGlyphs();
console.log('Recently used:', recent);

// Favorites
glyphsPanel.addToFavorites('★');
glyphsPanel.addToFavorites('♥');
glyphsPanel.addToFavorites('→');

const favorites = glyphsPanel.getFavorites();

// Render glyphs panel
glyphsPanel.renderPanel(ctx, 20, 20, 600, 400);
```

**Categories:**
- `letters` - A-Z, a-z
- `numbers` - 0-9
- `punctuation` - .,!? etc.
- `symbols` - ★♥→ etc.
- `special` - Extended Unicode

---

### 13. Baseline Grid - Text Alignment

**Use Case:** Align text to a consistent vertical rhythm.

```javascript
const { BaselineGrid } = require('./src/vector-tools.js');

// Create grid
const grid = new BaselineGrid(24); // 24px spacing

// Configure
grid.setOffset(10); // Start 10px from top
grid.show();
grid.enableSnap();

// Draw grid
grid.draw(ctx, canvas.width, canvas.height);

// Snap text to grid
const y1 = 42; // Original position
const snappedY1 = grid.snapToGrid(y1); // Snapped: 34

ctx.font = '16px Arial';
ctx.fillText('Snapped to grid', 50, snappedY1);

// Add sub-grid with different spacing
grid.addSubGrid(12, 'rgba(0, 150, 255, 0.15)');

// Get all grid lines in a range
const lines = grid.getGridLines(0, 500);
console.log('Grid lines:', lines);
```

**Use Cases:**
- Magazine layouts
- Professional documents
- Consistent typography
- Multi-column layouts

---

### 14. Hyphenation & Justification - Text Flow

**Use Case:** Professional paragraph formatting for publications.

```javascript
const { HyphenationEngine, TextStyle } = require('./src/vector-tools.js');

// Initialize
const hyphen = new HyphenationEngine('en');
hyphen.enable();

// Configure
hyphen.minWordLength = 6;
hyphen.minCharsBeforeHyphen = 3;
hyphen.minCharsAfterHyphen = 2;
hyphen.preventWidows = true;
hyphen.preventOrphans = true;

// Create paragraph style
const style = new TextStyle('Body', 'paragraph');
style.fontSize = 16;
style.leading = 1.6;
style.alignment = 'justify'; // Full justification

// Layout text
const text = 'Professional typography implementation with advanced hyphenation...';
const lines = hyphen.layoutText(text, 400, ctx, style);

// Draw
hyphen.drawJustifiedText(ctx, lines, 50, 50, style);

// Find hyphenation points in a word
const points = hyphen.findHyphenationPoints('implementation');
console.log('Hyphenation points:', points); // [2, 5, 8, 11]

// Manually hyphenate a word
const result = hyphen.hyphenateWord('professional', 150, ctx);
console.log(result);
// { firstPart: 'profes-', secondPart: 'sional', hyphenated: true }
```

**Settings:**
- `minWordLength` - Don't hyphenate words shorter than this
- `minCharsBeforeHyphen` - Min chars before hyphen
- `minCharsAfterHyphen` - Min chars after hyphen
- `preventWidows` - Avoid single words on last line
- `preventOrphans` - Avoid single lines at column start

---

## 🎨 Integration Examples

### Example 1: Create a Logo with Compound Paths

```javascript
// Outer shape
const outer = new VectorPath();
outer.addPoint(100, 50, 'smooth');
outer.addPoint(200, 100, 'smooth');
outer.addPoint(100, 150, 'smooth');
outer.addPoint(50, 100, 'smooth');
outer.closed = true;

// Inner cutout
const inner = new VectorPath();
inner.addPoint(100, 80, 'smooth');
inner.addPoint(150, 100, 'smooth');
inner.addPoint(100, 120, 'smooth');
inner.addPoint(80, 100, 'smooth');
inner.closed = true;

// Combine
const logo = new CompoundPath();
logo.addPath(outer, 'positive');
logo.createHole(inner);

// Apply live corners
const rounded = LiveCorners.applyCorners(outer, 15, 'round');
logo.paths[0].path = rounded;

// Draw
logo.draw(ctx, '#4A90E2', '#2868A8', 3);
```

### Example 2: Animated Morphing Button

```javascript
const normalState = createRectangle(100, 100, 200, 50);
const hoverState = createRoundedRectangle(100, 100, 220, 60, 20);

let morphProgress = 0;
let isHovering = false;

function animate() {
    // Animate morphProgress toward target
    const target = isHovering ? 1 : 0;
    morphProgress += (target - morphProgress) * 0.1;
    
    // Morph between states
    const currentShape = PathMorph.blend(normalState, hoverState, morphProgress);
    
    // Draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    currentShape.draw(ctx, '#4A90E2', '#2868A8', 2);
    
    requestAnimationFrame(animate);
}

canvas.addEventListener('mouseenter', () => isHovering = true);
canvas.addEventListener('mouseleave', () => isHovering = false);
animate();
```

### Example 3: Professional Document Layout

```javascript
// Setup
const styleManager = new TextStyleManager();
const grid = new BaselineGrid(24);
const hyphen = new HyphenationEngine('en');

grid.show();
hyphen.enable();
hyphen.preventWidows = true;

// Styles
const heading = styleManager.getStyle('Heading 1');
const body = styleManager.getStyle('Body');
body.alignment = 'justify';

// Draw grid
grid.draw(ctx, canvas.width, canvas.height);

// Title
let y = grid.snapToGrid(50);
heading.apply(ctx);
ctx.fillText('Article Title', 50, y);

// Body text
y = grid.snapToGrid(y + 60);
const bodyText = 'Lorem ipsum dolor sit amet...';
const lines = hyphen.layoutText(bodyText, 500, ctx, body);
hyphen.drawJustifiedText(ctx, lines, 50, y, body);
```

---

## 📚 Best Practices

### Performance
1. **Cache simplified paths** - Simplify once, reuse multiple times
2. **Use lower tolerance** for simplification when performance matters
3. **Pre-compute morphing sequences** for animations
4. **Batch text rendering** - Layout once, render many times

### Quality
1. **Use smooth curves** after path simplification
2. **Enable kerning** for professional typography
3. **Use baseline grids** for consistent layouts
4. **Apply hyphenation** to justified text

### Workflow
1. **Create style library** - Define all text styles upfront
2. **Export/import styles** - Share across projects
3. **Use compound paths** for complex logos
4. **Test on different fonts** - Variable fonts behave differently

---

## 🔧 Troubleshooting

### Common Issues

**Problem:** Compound paths not showing holes
- **Solution:** Ensure inner path is marked as 'negative' with `createHole()`
- Check fill rule is set correctly ('evenodd' vs 'nonzero')

**Problem:** Path simplification removes too many points
- **Solution:** Increase tolerance value (try 15-20)
- Use `smoothCurves()` after simplification

**Problem:** Text effects not visible
- **Solution:** Check effect order - shadows before fills
- Ensure sufficient canvas size for blur effects

**Problem:** Morphing looks jerky
- **Solution:** Increase number of steps in `createSteps()`
- Ensure both paths have similar structure

**Problem:** Hyphenation not working
- **Solution:** Check `enable()` was called
- Verify `minWordLength` allows hyphenation
- Ensure context has proper font set

---

## 📖 Additional Resources

- **Test Suite:** `test-category-7-vector-typography.html` - Interactive examples
- **API Docs:** `CATEGORY_7_COMPLETION_SUMMARY.md` - Full API reference
- **Source Code:** `src/vector-tools.js` - Implementation with JSDoc

---

**Happy Creating!** 🎨

For questions or issues, please refer to the GitHub repository or the comprehensive test suite for live examples.
