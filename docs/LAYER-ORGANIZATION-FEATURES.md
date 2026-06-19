# Layer Organization Features

## Overview
This document describes the new Krita-inspired layer organization features added to ARTemis.

## New Features

### 1. Layer Types
ARTemis now supports five different layer types to help organize your artwork:

- **🎨 Paint Layer** (default) - Standard raster painting layer
- **📐 Vector Layer** - For vector-based artwork (framework ready)
- **✨ Filter Layer** - For non-destructive effects (framework ready)
- **📁 Group Layer** - For organizing related layers together
- **📄 File Layer** - For referencing external files (framework ready)

**How to use:**
- Select the desired layer type from the dropdown in the Layers panel header before clicking "+"
- Layer type is displayed as an icon next to the layer name
- Layer type is preserved when saving/loading projects

### 2. Layer Ordering
You can now reorder layers in your composition:

- **Move Layer Up** - Moves the active layer up in the stack (Ctrl/Cmd + ])
- **Move Layer Down** - Moves the active layer down in the stack (Ctrl/Cmd + [)

**How to use:**
- Select a layer by clicking on it
- Click the up/down arrow buttons in the layer panel footer
- Or use the keyboard shortcuts Ctrl/Cmd + [ or ]
- Or use the Layer menu

**Note:** Higher layers in the list are rendered on top of lower layers.

### 3. Flatten Layers
Combine all visible layers into a single layer:

- **Flatten All Layers** - Merges all visible layers into one (Ctrl/Cmd + Shift + E)

**How to use:**
- Click the flatten button in the layer panel footer (stacked squares icon)
- Or use keyboard shortcut Ctrl/Cmd + Shift + E
- Or use Layer menu → Flatten All Layers
- Confirm the operation (this cannot be undone)

**Note:** 
- Only visible layers are included in the flatten operation
- Hidden layers are excluded
- The result is a single paint layer named "Flattened"
- This is useful for finalizing your work or improving performance

## UI Changes

### Layer Panel Header
- Added layer type selector dropdown between "Layers" title and "+" button
- Dropdown shows emoji icons for each layer type for easy identification

### Layer Panel Footer
- Added "Move Layer Up" button (up arrow)
- Added "Move Layer Down" button (down arrow)
- Added "Flatten All Layers" button (stacked squares)
- Existing duplicate and delete buttons remain

### Layer List Items
- Each layer now displays a type icon (emoji) below the layer name
- Icons help quickly identify layer types at a glance

## Keyboard Shortcuts

### New Shortcuts
- `Ctrl/Cmd + ]` - Move layer up
- `Ctrl/Cmd + [` - Move layer down
- `Ctrl/Cmd + Shift + E` - Flatten all layers

### Existing Layer Shortcuts
- `Ctrl/Cmd + Shift + N` - New layer
- `Ctrl/Cmd + J` - Duplicate layer
- `Delete` - Delete layer
- `Ctrl/Cmd + E` - Merge layer down

## File Format
The .artemis project file format has been updated to include:
- `type` property for each layer (defaults to 'paint' for backward compatibility)
- `children` property for group layers (currently empty array)

Old .artemis files will open correctly and layers will default to 'paint' type.

## Technical Details

### Layer Object Structure
```javascript
{
    id: Number,           // Unique identifier
    name: String,         // Layer name
    canvas: Canvas,       // HTML5 canvas element
    visible: Boolean,     // Visibility state
    opacity: Number,      // 0-1 opacity value
    type: String,         // 'paint', 'vector', 'filter', 'group', 'file'
    children: Array|null  // Child layers for groups (null for other types)
}
```

### Implementation Notes
- Layer types other than 'paint' are framework-ready but do not have special rendering behavior yet
- Group layers have a `children` array but flattening/nesting is not yet implemented
- Vector, filter, and file layers currently render like paint layers
- Future updates will add specialized rendering for each layer type

## Best Practices

1. **Use Layer Types Meaningfully**
   - Paint layers for drawing and painting
   - Group layers to organize related elements
   - Plan for future vector/filter capabilities

2. **Layer Ordering**
   - Keep backgrounds at the bottom
   - Foreground elements at the top
   - Use ordering to adjust composition without redrawing

3. **Flattening**
   - Only flatten when you're confident with your composition
   - Consider duplicating your project before flattening
   - Flattening improves performance for complex documents

4. **Organization**
   - Name layers descriptively
   - Use layer types to categorize your work
   - Toggle visibility to focus on specific elements

## Future Enhancements
- Layer grouping with parent-child relationships
- Drag and drop layer reordering
- Layer renaming by clicking on name
- Specialized rendering for vector/filter/file layers
- Layer effects and blend modes
- Layer masks
- Adjustment layers
