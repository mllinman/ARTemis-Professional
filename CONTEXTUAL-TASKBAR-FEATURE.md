# Contextual Task Bar Feature

## Overview

The Contextual Task Bar is a dynamic menu that appears below the main toolbar, providing quick access to tool-specific options without navigating through multiple panels. It automatically updates based on the currently selected tool.

## Features

### Dynamic Context Switching
- Automatically displays relevant options when a tool is selected
- Smooth transitions between different tool contexts
- Matches the existing dark theme design

### Tool-Specific Contexts

#### Brush & Eraser Tools
- **Quick Size Presets**: Small (10px), Medium (50px), Large (100px)
- **Opacity Buttons**: 25%, 50%, 75%, 100%
- Instantly updates both the state and left panel controls

#### Selection Tool
- **Select All**: Quickly select the entire canvas
- **Deselect**: Clear current selection
- **Copy/Cut/Paste**: Standard clipboard operations

#### Shapes Tool
- **Shape Type Buttons**: Rectangle, Circle, Star
- **Fill Toggle**: Switch between filled and outlined shapes
- Syncs with the Shape Templates section

#### Text Tool
- **Text Formatting**: Bold, Italic buttons
- **Font Size Dropdown**: 12px to 72px options

#### Transform Tools (Move, Rotate, Scale)
- **Apply/Cancel**: Commit or discard transformations
- **Flip Horizontal/Vertical**: Quick flip operations

#### Fill Tool
- **Tolerance Presets**: Low, Medium, High
- **Contiguous Checkbox**: Toggle fill behavior

#### Other Tools (Eyedropper, Gradient, Crop, Clone, Dodge, Burn, Sponge)
- **Info Message**: Directs users to the left panel for detailed settings

## Technical Implementation

### HTML Structure
- Located between `#toolbar` and `#main-container`
- Uses `data-tools` attribute to associate contexts with tools
- Multiple context groups, only one visible at a time

### CSS Styling
- Background: `#252526` (matching panel background)
- Border: `1px solid #3e3e42`
- Accent: `#0e639c` (matching active states)
- Buttons: 26px height with hover/active states
- Responsive layout with flexbox

### JavaScript Logic
- `updateContextualTaskbar(toolName)`: Shows/hides context groups
- `setupContextualTaskbar()`: Initializes button event handlers
- Integrated into `selectTool()` for automatic updates
- Updates both state and UI controls synchronously

## User Benefits

1. **Faster Workflow**: Access common tool options without opening panels
2. **Less Distraction**: No need to search through settings
3. **Context Awareness**: Only see options relevant to current tool
4. **Professional Feel**: Matches design patterns in industry-standard tools

## Code Changes Summary

- **src/index.html**: +138 lines (contextual task bar HTML)
- **src/renderer.js**: +115 lines (update and handler functions)
- **src/styles.css**: +129 lines (contextual task bar styles)
- **Total**: 382 insertions, 4 deletions

## Screenshots

See PR description for visual examples of the contextual task bar with different tools.

## Future Enhancements

Potential additions:
- More tool-specific quick actions
- Keyboard shortcuts displayed on buttons
- Customizable button sets
- Animation transitions between contexts
- Tool presets in the context bar
