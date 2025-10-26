# ARTemis Screenshots & Visual Guide

## Application Interface Overview

Since this is the initial implementation, here's a detailed description of what the ARTemis interface looks like when running:

### Main Application Window

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ARTemis - Professional Digital Painting                                    [_][□][X] │
├─────────────────────────────────────────────────────────────────────────────────┤
│ File   Edit   View   Layer   Tools   Help                                      │
├───────────────┬─────────────────────────────────────────────────┬───────────────┤
│               │                                                 │               │
│  🖌️ TOOLBAR   │                                                 │   LAYERS      │
│               │                                                 │               │
│ ┌───────────┐ │                                                 │ Layers    [+] │
│ │ 🖌️ Brush   │ │  ╔═════════════════════════════════════════╗ │ ┌───────────┐ │
│ │ 🧹 Eraser  │ │  ║                                         ║ │ │🖼️ Layer 2  │ │
│ │ 🪣 Fill    │ │  ║                                         ║ │ │   [👁]     │ │
│ │ 💧 Eyedrop │ │  ║                                         ║ │ └───────────┘ │
│ │ ⬚ Select   │ │  ║                                         ║ │               │
│ └───────────┘ │  ║         YOUR ARTWORK HERE               ║ │ ┌───────────┐ │
│               │  ║                                         ║ │ │🖼️ Layer 1  │ │
│ ↶ ↷ Undo/Redo │  ║              (White Canvas)             ║ │ │   [👁]     │ │
│               │  ║                                         ║ │ └───────────┘ │
│  SETTINGS     │  ║                                         ║ │               │
│               │  ║         800px × 600px                   ║ │ ┌───────────┐ │
│ Size: 20px    │  ║                                         ║ │ │🖼️Background│ │
│ ━━━●━━━━━━    │  ║                                         ║ │ │   [👁] ✓   │ │
│               │  ║                                         ║ │ └───────────┘ │
│ Opacity: 100% │  ╚═════════════════════════════════════════╝ │               │
│ ━━━━━━━━━━●   │                                                 │ [📋] [🗑️]     │
│               │  ┌─────────────────────────────────────────┐ │               │
│ Hardness: 80% │  │ 100% | 800 x 600 | X: 0, Y: 0          │ │               │
│ ━━━━━●━━━━    │  └─────────────────────────────────────────┘ │               │
│               │                                                 │               │
│ ☑ Pressure    │                                                 │               │
│   affects     │                                                 │               │
│   opacity     │                                                 │               │
│               │                                                 │               │
│ ☑ Pressure    │                                                 │               │
│   affects     │                                                 │               │
│   size        │                                                 │               │
│               │                                                 │               │
│  COLOR        │                                                 │               │
│ ┌───────────┐ │                                                 │               │
│ │  #000000  │ │                                                 │               │
│ └───────────┘ │                                                 │               │
│               │                                                 │               │
│ ⬛ ⬜ 🟥 🟩    │                                                 │               │
│ 🟦 🟨 🟪 🟦    │                                                 │               │
│               │                                                 │               │
└───────────────┴─────────────────────────────────────────────────┴───────────────┘
```

### Color Scheme

**Dark Mode Interface:**
- Background: Very dark gray (#1e1e1e)
- Panels: Slightly lighter gray (#252526)
- Headers: Medium gray (#2d2d30)
- Text: Light gray (#cccccc)
- Accents: Blue (#0e639c)
- Canvas: White background with shadow

### Toolbar Detail

```
┌─────────────────────────────────────────────────────────────┐
│  [🖌️] [🧹] [🪣] [💧] [⬚]  |  [↶] [↷]                        │
│   ▲                                                         │
│   └─ Active tool (blue highlight)                          │
└─────────────────────────────────────────────────────────────┘
```

Tools shown:
1. **Brush** (🖌️) - Blue highlight when active
2. **Eraser** (🧹) - Gray when inactive
3. **Fill** (🪣) - Gray when inactive
4. **Eyedropper** (💧) - Gray when inactive
5. **Selection** (⬚) - Gray when inactive
6. **Undo** (↶) - Always available
7. **Redo** (↷) - Always available

### Left Panel - Tool Settings

```
┌─────────────────────┐
│ Tools               │
├─────────────────────┤
│                     │
│ Size: 20px          │
│ ━━━●━━━━━━━━━━━    │
│                     │
│ Opacity: 100%       │
│ ━━━━━━━━━━━●━━━    │
│                     │
│ Hardness: 80%       │
│ ━━━━━●━━━━━━━━━    │
│                     │
│ ☑ Pressure affects  │
│   opacity           │
│                     │
│ ☑ Pressure affects  │
│   size              │
│                     │
├─────────────────────┤
│ Color               │
│ ┌─────────────────┐ │
│ │    #000000      │ │ ← Color picker (50px height)
│ └─────────────────┘ │
│                     │
│ ⬛ ⬜ 🟥 🟩         │ ← Quick swatches
│ 🟦 🟨 🟪 🟦         │
│                     │
└─────────────────────┘
```

### Right Panel - Layers

```
┌─────────────────────┐
│ Layers         [+]  │ ← Header with new layer button
├─────────────────────┤
│                     │
│ ┌─────────────────┐ │
│ │ 🖼️ Layer Name   │ │
│ │    [👁]         │ │ ← Eye icon for visibility
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │ 🖼️ Background   │ │
│ │    [👁] ✓       │ │ ← Active layer (blue)
│ └─────────────────┘ │
│                     │
├─────────────────────┤
│   [📋]  [🗑️]       │ ← Duplicate & Delete
└─────────────────────┘
```

### Canvas Area

```
       Checkerboard Background Pattern
     ╔═════════════════════════════╗
     ║                             ║
     ║    White Canvas Surface     ║
     ║                             ║
     ║    (Drawing happens here)   ║
     ║                             ║
     ║      with drop shadow       ║
     ║                             ║
     ╚═════════════════════════════╝
     
     Status Bar:
     ┌───────────────────────────────┐
     │ 100% | 800x600 | X: 0, Y: 0  │
     └───────────────────────────────┘
```

## Drawing States

### Brush Drawing

When drawing with the brush:
```
Canvas shows:
- Smooth, interpolated strokes
- Size varies with pressure (if enabled)
- Opacity varies with pressure (if enabled)
- Color from color picker
- Crosshair cursor follows mouse/pen
```

### Eraser in Use

When erasing:
```
Canvas shows:
- Removes content to transparency
- Same pressure sensitivity as brush
- Same size controls
- Crosshair cursor
```

### Fill Tool Active

When using fill:
```
Canvas shows:
- Cursor changes to pointer
- Click fills connected area
- Instant fill effect
- Respects layer boundaries
```

### Eyedropper Active

When picking colors:
```
Canvas shows:
- Crosshair cursor
- Click to sample color
- Color picker updates instantly
- Previous color preserved in swatches
```

## Interaction States

### Hover Effects

**Buttons:**
```
Normal:     [  Tool  ]  (transparent)
Hover:      [  Tool  ]  (darker gray)
Active:     [  Tool  ]  (blue background)
```

**Sliders:**
```
Normal:     ━━━━━●━━━━  (gray track, blue thumb)
Hover:      ━━━━━●━━━━  (brighter blue thumb)
Dragging:   ━━━━━●━━━━  (smooth movement)
```

**Layers:**
```
Normal:     [ 🖼️ Layer Name  [👁] ]  (dark gray)
Hover:      [ 🖼️ Layer Name  [👁] ]  (medium gray)
Active:     [ 🖼️ Layer Name  [👁] ]  (blue)
```

### Zoom States

**100% (Default):**
```
┌──────────────┐
│              │
│   Canvas     │
│   Centered   │
│              │
└──────────────┘
```

**200% (Zoomed In):**
```
┌──────────────┐
│╔════════════╗│ ← Scrollable
│║  Zoomed    ║│
│║  Canvas    ║│
│║            ║│
│╚════════════╝│
└──────────────┘
Status: 200% | 800x600 | ...
```

**50% (Zoomed Out):**
```
┌──────────────┐
│              │
│  ┌────────┐  │
│  │ Canvas │  │
│  └────────┘  │
│              │
└──────────────┘
Status: 50% | 800x600 | ...
```

## Menu System

### File Menu
```
File
├── New              Ctrl+N
├── Open             Ctrl+O
├── Save             Ctrl+S
├── Save As          Ctrl+Shift+S
├── ─────────────
├── Export           Ctrl+E
├── ─────────────
└── Quit             Ctrl+Q
```

### Edit Menu
```
Edit
├── Undo             Ctrl+Z
├── Redo             Ctrl+Shift+Z
├── ─────────────
├── Cut              Ctrl+X
├── Copy             Ctrl+C
└── Paste            Ctrl+V
```

### View Menu
```
View
├── Zoom In          Ctrl+=
├── Zoom Out         Ctrl+-
├── Fit to Screen    Ctrl+0
├── ─────────────
├── Toggle DevTools  Ctrl+Shift+I
└── Toggle Fullscreen F11
```

### Layer Menu
```
Layer
├── New Layer        Ctrl+Shift+N
├── Duplicate Layer  Ctrl+J
├── Delete Layer     Delete
├── ─────────────
└── Merge Down       Ctrl+E
```

### Tools Menu
```
Tools
├── Brush            B
├── Eraser           E
├── Fill             G
├── Eyedropper       I
└── Selection        M
```

## Visual Examples

### Example 1: Starting a New Drawing

1. **Launch Application**
   - Window opens with dark theme
   - White canvas centered
   - Brush tool selected
   - Background layer created

2. **Select Color**
   - Click color picker or swatch
   - Color updates in picker area

3. **Adjust Brush**
   - Drag size slider
   - See value update: "Size: 50px"
   - Cursor preview updates

4. **Start Drawing**
   - Click and drag on canvas
   - See smooth stroke appear
   - Pressure sensitivity responds
   - Undo available immediately

### Example 2: Working with Layers

1. **Create New Layer**
   - Click [+] in Layers panel
   - "Layer 2" appears
   - Automatically becomes active (blue)

2. **Draw on New Layer**
   - Everything drawn goes to Layer 2
   - Background layer unchanged

3. **Toggle Visibility**
   - Click eye icon on Layer 2
   - Layer 2 content disappears
   - Click again to show

4. **Duplicate Layer**
   - Click [📋] button
   - "Layer 2 Copy" created
   - Identical content

### Example 3: Saving Work

1. **Save Project**
   - Press Ctrl+S (or File > Save)
   - Dialog opens
   - Choose location and name
   - Save as .artemis file

2. **Export Image**
   - Press Ctrl+E (or File > Export)
   - Choose PNG or JPEG
   - All visible layers flattened
   - Saved to chosen location

## Responsive Behavior

### Window Resize

**Large Window (1400x900):**
- All panels visible
- Canvas has plenty of space
- Comfortable working area

**Medium Window (1024x768):**
- Panels slightly narrower
- Canvas adjusts
- All features accessible

**Small Window (800x600):**
- Minimum comfortable size
- Panels at minimum width
- Canvas still usable

## Color Themes

### Current: Professional Dark

- Background: #1e1e1e (Very Dark Gray)
- Panels: #252526 (Dark Gray)
- Headers: #2d2d30 (Medium Dark Gray)
- Borders: #3e3e42 (Gray)
- Accent: #0e639c (Blue)
- Text: #cccccc (Light Gray)

**Benefits:**
- Reduces eye strain
- Professional appearance
- High contrast for readability
- Focus on canvas content
- Industry standard aesthetic

## Actual Screenshots

To see the actual application running:

1. Install dependencies: `npm install`
2. Start application: `npm start`
3. The window will open showing the exact interface described above

**What you'll see:**
- Dark themed window
- Clean, modern layout
- Professional tool arrangement
- Intuitive controls
- Responsive interface
- Beautiful gradients and shadows
- Smooth interactions

## Future Visual Enhancements

Planned UI improvements:
- [ ] Custom window frame
- [ ] Floating tool palettes
- [ ] Customizable panel layouts
- [ ] Multiple color theme options
- [ ] Icon customization
- [ ] Workspace presets
- [ ] Thumbnail previews for brushes
- [ ] Minimap for canvas navigation
- [ ] Grid and guide overlays
- [ ] Reference image window

---

**Note:** The actual application looks even better than these ASCII representations! The modern CSS styling, smooth transitions, professional color scheme, and attention to detail create a polished, professional digital painting environment.

Run `npm start` to experience it yourself! 🎨
