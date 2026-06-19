# ARTemis UI Design

## Visual Design Philosophy

ARTemis features a **modern, clean, professional dark mode interface** designed specifically for digital artists. The UI prioritizes:

1. **Minimal Distraction** - Dark theme reduces eye strain during long painting sessions
2. **Intuitive Layout** - Everything is where you expect it to be
3. **Maximum Canvas Space** - UI elements are compact but accessible
4. **Professional Aesthetic** - Clean lines, subtle colors, modern icons
5. **Touch-Optimized** - Large enough targets for touch/pen input

## Color Palette

### Dark Theme Colors
```
Background:        #1e1e1e  (Main background)
Panel Background:  #252526  (Sidebars)
Panel Header:      #2d2d30  (Panel headers/footers)
Borders:           #3e3e42  (Separators and outlines)
Accent Blue:       #0e639c  (Active states, selections)
Text Primary:      #cccccc  (Main text)
Text Secondary:    #858585  (Info text)
White:             #ffffff  (High contrast text)
```

### Rationale
- Based on proven dark theme standards (VS Code inspiration)
- Carefully chosen contrast ratios for readability
- Blue accent for visual hierarchy without distraction
- Subtle grays for depth without harshness

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Toolbar (Top)                                                  │
│  [Tools] | [Actions]                                            │
├──────────┬───────────────────────────────────────┬──────────────┤
│          │                                       │              │
│  Left    │         Canvas Area                   │   Right      │
│  Panel   │                                       │   Panel      │
│          │  ┌─────────────────────────────────┐ │              │
│  Tools & │  │                                 │ │   Layers     │
│ Settings │  │                                 │ │              │
│          │  │        Your Artwork             │ │   [Layer 2]  │
│  [Size]  │  │                                 │ │   [Layer 1]  │
│  [----]  │  │                                 │ │   [Active]   │
│          │  │                                 │ │              │
│  [Opacity│  └─────────────────────────────────┘ │   [+ New]    │
│  [----]  │                                       │   [Actions]  │
│          │  Status: Zoom | Size | Position      │              │
├──────────┴───────────────────────────────────────┴──────────────┤
```

## Component Details

### Top Toolbar
- **Height:** 56px
- **Background:** #2d2d30
- **Layout:** Horizontal sections separated by subtle dividers
- **Icons:** 24x24px, Material Design style
- **Padding:** Generous spacing for easy clicking

**Section 1: Drawing Tools**
- Brush (B)
- Eraser (E)
- Fill (G)
- Eyedropper (I)
- Selection (M)

**Section 2: Actions**
- Undo (Ctrl+Z)
- Redo (Ctrl+Shift+Z)

### Left Panel (Tools & Settings)
- **Width:** 280px
- **Background:** #252526
- **Header:** Tool Settings title
- **Content:** Scrollable settings area

**Brush Settings Section:**
```
Size: [50]px
━━━━━●━━━━━━  (Slider with blue handle)

Opacity: [100]%
━━━━━━━━━━━●

Hardness: [80]%
━━━━━━━●━━━━

☑ Pressure affects opacity
☑ Pressure affects size
```

**Color Picker Section:**
```
┌─────────────────────┐
│  Color Input        │  (50px height)
│  [Current Color]    │
└─────────────────────┘

Quick Swatches:
[⬛][⬜][🟥][🟩]
[🟦][🟨][🟪][🟦]
```

### Canvas Area
- **Background:** Transparent checkerboard pattern
- **Pattern:** 20x20px gray squares
- **Canvas:** White background with shadow
- **Shadow:** 0 4px 12px rgba(0,0,0,0.5)
- **Cursor:** Crosshair for precision

**Status Bar (Bottom):**
- Background: #2d2d30
- Height: 32px
- Info displayed: `100% | 800 x 600 | X: 123, Y: 456`

### Right Panel (Layers)
- **Width:** 280px
- **Background:** #252526
- **Header:** "Layers" with [+] button
- **Content:** Scrollable layer list

**Layer Item:**
```
┌────────────────────────────────┐
│ [Thumb]  Layer Name      [👁] │  (Active: blue bg)
│          (Details)             │
└────────────────────────────────┘
```

**Layer Thumbnail:**
- Size: 40x40px
- Border: 1px solid #3e3e42
- Shows actual layer content scaled down

**Footer:**
```
[📋 Duplicate] [🗑️ Delete]
```

## Interactive Elements

### Buttons

**Tool Buttons:**
- Size: 40x40px
- Padding: 8px
- Border-radius: 4px
- Hover: #3e3e42 background
- Active: #0e639c background
- Transition: 0.2s smooth

**Icon Buttons:**
- Border: 1px solid #3e3e42
- Hover: Border changes to #0e639c
- Active: Scale down 95%

### Sliders
- Track height: 4px
- Track color: #3e3e42
- Thumb size: 14x14px
- Thumb color: #0e639c (accent blue)
- Smooth dragging with instant feedback

### Input Fields
- Color input: Full width, 50px height
- Checkbox: 14px with 8px margin
- All inputs have hover and focus states

## Typography

### Font Family
```css
font-family: -apple-system, BlinkMacSystemFont, 
             'Segoe UI', Roboto, 'Helvetica Neue', 
             Arial, sans-serif;
```

### Font Sizes
- Panel headers: 14px, weight 600
- Settings labels: 13px, weight 400
- Layer names: 13px, weight 500
- Status bar: 12px, weight 400
- Values: 13px, weight 400

### Colors
- Primary text: #cccccc
- Secondary text: #858585
- Active text: #ffffff

## Spacing System

### Padding/Margin Scale
- XS: 4px
- S: 8px
- M: 12px
- L: 16px
- XL: 24px

**Application:**
- Toolbar padding: 8px 12px
- Panel padding: 16px
- Setting group margin: 16px
- Button gap: 4px
- Section gap: 12px

## Icons

### Style
- Material Design inspired
- 24x24px for toolbar
- 18x18px for panel actions
- 16x16px for small actions
- Fill style (not outline)
- Current color inheritance

### Icon Colors
- Default: #cccccc
- Hover: #ffffff
- Active tool: #ffffff (on blue background)

## Animations & Transitions

### Hover Effects
```css
transition: all 0.2s ease;
```
- Background color changes
- Border color changes
- Slight scale on active clicks (95%)

### Smooth Operations
- Layer switching: Instant highlight
- Tool switching: Instant with visual feedback
- Zoom: Smooth scaling
- Pan: Immediate response

## Responsive Behavior

### On Smaller Screens (< 1024px)
- Panels reduce to 240px width
- Font sizes remain the same
- Canvas adjusts to available space
- All features remain accessible

### Zoom Behavior
- Canvas scales smoothly
- UI remains fixed size
- Scrollbars appear when needed
- Info bar updates in real-time

## Accessibility

### Keyboard Navigation
- Tab through interactive elements
- Enter to activate buttons
- Arrow keys for sliders (future)
- Escape to cancel operations (future)

### Visual Feedback
- Clear active states
- Hover states on all interactive elements
- Focus indicators (browser default enhanced)
- High contrast ratios (WCAG compliant)

### Tooltips
- All tool buttons have titles
- Keyboard shortcuts shown in tooltips
- Appear on hover after brief delay

## Scrollbars

### Custom Styling
- Width: 12px
- Track: #1e1e1e
- Thumb: #3e3e42
- Thumb hover: #4e4e52
- Border-radius: 6px

## Canvas Presentation

### Background Pattern
```
Checkerboard:
- Light square: transparent
- Dark square: #2a2a2a
- Size: 20x20px
- Rotated 45° appearance
```

### Canvas Shadow
```css
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
```
Creates depth and separation from background

### Cursor
- Crosshair for precision tools
- Pointer for fill and selection
- Grab for panning
- Default for UI areas

## Layer Visibility

### Visible Layer Icon
```
👁 (Eye open)
- Color: #cccccc
- Hover: #ffffff
```

### Hidden Layer Icon
```
👁‍🗨 (Eye closed/slashed)
- Color: #858585
- Hover: #cccccc
```

## State Indicators

### Active Layer
- Background: #0e639c
- Text: #ffffff
- Border: none (distinguished by background)

### Disabled State
- Opacity: 0.5
- Cursor: not-allowed
- No hover effect

### Loading State (future)
- Spinner or progress indicator
- Dimmed background
- Centered in canvas area

## Professional Polish

### Subtle Details
1. **Hover Elevations** - Elements feel clickable
2. **Smooth Transitions** - Nothing is jarring
3. **Consistent Spacing** - Visual rhythm throughout
4. **Clear Hierarchy** - Important elements stand out
5. **Refined Borders** - Subtle but effective separation

### Visual Hierarchy
1. **Primary:** Canvas (largest, centered, white)
2. **Secondary:** Active tool, active layer (blue highlight)
3. **Tertiary:** Panel contents (subtle gray)
4. **Quaternary:** Status info (smaller, dimmer text)

## Design Principles Applied

1. **Less is More** - Only essential UI elements
2. **Consistency** - Same patterns throughout
3. **Feedback** - Every interaction has a response
4. **Forgiveness** - Undo/redo always available
5. **Efficiency** - Keyboard shortcuts for power users
6. **Beauty** - Professional aesthetic throughout

## Comparison to Competition

### vs. Photoshop
- **Cleaner:** No cluttered icon sets
- **Darker:** Better contrast and focus
- **Simpler:** Fewer overwhelming options

### vs. Krita
- **More Modern:** Current web design patterns
- **Better Organized:** Logical panel structure
- **Refined:** Subtle, professional aesthetic

### vs. Others
- **Touch-Optimized:** Larger touch targets
- **Modular:** Clear panel separation
- **Professional:** Industry-standard dark theme

## Enhanced UI Features (NEW)

### ✨ Collapsible Panels
- **Left Panel (Tools):** Click the collapse button (◀) in the header to minimize the panel
- **Right Panel (Layers):** Click the collapse button (▶) in the header to minimize the panel
- **Collapsed State:** Panel shrinks to 48px width, showing only the collapse button
- **Smooth Animation:** 0.3s ease transition for professional feel
- **Maximized Canvas:** Collapsing panels gives more space for artwork

### 📏 Resizable Panels
- **Drag Handles:** 4px resize handles on panel edges (blue highlight on hover/drag)
- **Left Panel:** Drag right edge to resize (200px - 600px range)
- **Right Panel:** Drag left edge to resize (200px - 600px range)
- **Touch Support:** Full touch/pen support for resizing on tablets
- **Visual Feedback:** Handle turns blue (#0e639c) when dragging

### 📂 Expandable Sections
Settings are now organized into collapsible sections:
- **Brush Settings:** Size, Opacity, Hardness controls
- **Pressure Sensitivity:** Pressure affects opacity/size toggles
- **Color:** Color picker and swatches

Each section has:
- Click header to expand/collapse
- Arrow indicator (▼) rotates when collapsed
- Smooth height animation
- Content hidden when collapsed to save space

### 🎨 Enhanced Visual Polish
- **Depth & Shadows:** Panels, buttons, and layers have subtle shadows for better depth perception
- **Hover Effects:** All interactive elements lift slightly on hover with transform animations
- **Active States:** Selected tools and layers have glowing blue shadows
- **Smooth Transitions:** All UI elements animate smoothly (0.2s-0.3s transitions)
- **Better Contrast:** Improved shadow and border styling for better visual hierarchy

### 👆 Touch-Optimized Improvements
- **Larger Touch Targets:** All buttons and controls sized appropriately for touch
- **Touch Resize:** Panel resize handles work with touch gestures
- **Visual Feedback:** Hover/active states work with touch interactions
- **Responsive:** All animations and transitions work smoothly on touch devices

## UI Enhancements Completed

- [x] **Collapsible panels** - Maximize canvas space
- [x] **Resizable panels** - Customize workspace layout
- [x] **Expandable sections** - Organized settings
- [x] **Enhanced visual polish** - Professional depth and shadows
- [x] **Touch optimization** - Full touch/pen support
- [ ] Color theme options
- [ ] Custom icon sets
- [ ] Workspace presets
- [ ] Floating panels
- [ ] Multi-monitor support
- [ ] UI scaling options

---

**Result:** A clean, modern, professional dark mode interface that lets artists focus on their work without distraction, with refined tools that feel natural and responsive. The new collapsible and resizable panels provide a flexible, industry-standard workflow similar to Photoshop and Krita.
