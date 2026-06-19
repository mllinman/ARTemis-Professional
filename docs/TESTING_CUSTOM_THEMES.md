# Testing Guide: Custom Theme System

## Overview
This guide helps you test the new custom theme system in ARTemis Professional.

## Setup

### Browser Mode (Recommended for Quick Testing)
1. Open `src/index.html` directly in Chrome, Edge, Firefox, or Safari
2. The application will load with the default dark theme

### Electron Mode
1. Run `npm install` (if not already done)
2. Run `npm start`
3. Application launches in Electron window

## Test Cases

### Test 1: View Theme Presets
**Steps:**
1. Click "Workspace" menu (or menu bar in browser)
2. Click "Theme Presets..."
3. A dialog should appear showing 7 theme cards in a 2-column grid

**Expected Results:**
- ✅ Dialog displays with 7 themes
- ✅ Each theme shows color preview bars
- ✅ Current theme is highlighted with blue border
- ✅ Hover effect scales cards slightly

### Test 2: Switch Theme Presets
**Steps:**
1. Open Theme Presets dialog
2. Click on "Ocean Blue" theme card
3. Observe UI changes

**Expected Results:**
- ✅ UI immediately changes to blue color scheme
- ✅ Notification appears: "Theme changed to Ocean Blue"
- ✅ Dialog closes automatically
- ✅ All UI elements update (menu bar, panels, buttons)

**Repeat with other themes:**
- Light (bright, clean appearance)
- Forest Green (green tones)
- Royal Purple (purple palette)
- Warm Sunset (orange/brown)
- High Contrast (black/white for accessibility)

### Test 3: Create Custom Theme
**Steps:**
1. Open Theme Presets dialog
2. Click "Create Custom Theme"
3. Enter theme name: "My Test Theme"
4. Click on each color picker and change colors:
   - Background Primary: Choose a color
   - Background Secondary: Choose a different shade
   - Text Primary: Choose readable text color
   - Accent: Choose highlight color
5. Watch live preview update
6. Click "Preview" to test on main UI
7. Click "Save Theme"

**Expected Results:**
- ✅ Theme creator dialog opens with 8 color pickers
- ✅ Live preview updates as colors change
- ✅ Preview shows sample UI elements
- ✅ "Preview" button applies to main UI temporarily
- ✅ "Save Theme" saves and applies permanently
- ✅ Success notification appears
- ✅ Custom theme appears in presets list

### Test 4: Export Theme
**Steps:**
1. Apply any theme (preset or custom)
2. Open Theme Presets dialog
3. Click "Export Current Theme"
4. Enter name: "My Export"
5. Check downloads folder

**Expected Results:**
- ✅ Prompt appears for theme name
- ✅ JSON file downloads (e.g., `my-export-theme.json`)
- ✅ File contains valid JSON with colors
- ✅ Success notification appears

### Test 5: Import Theme
**Steps:**
1. Create a test theme JSON file or use exported file
2. Open Theme Presets dialog
3. Click "Import Theme"
4. Select JSON file
5. Observe theme applied

**Expected Results:**
- ✅ File picker appears
- ✅ Theme imports successfully
- ✅ Theme automatically applies
- ✅ Theme appears in presets list
- ✅ Success notification shows theme name
- ✅ Invalid files show error alert

### Test 6: Theme Persistence
**Steps:**
1. Select any theme (e.g., Forest Green)
2. Close and reopen the application
3. Observe theme on startup

**Expected Results:**
- ✅ Application loads with Forest Green theme
- ✅ Theme persists across sessions
- ✅ Custom themes remain available

### Test 7: Quick Theme Toggle (Legacy)
**Steps:**
1. Press Ctrl+Shift+T (or Cmd+Shift+T on Mac)

**Expected Results:**
- ✅ Theme toggles between Dark and Light
- ✅ Works as quick shortcut

### Test 8: Keyboard Navigation
**Steps:**
1. Open Theme Presets dialog
2. Use Tab key to navigate
3. Use Enter to select buttons
4. Use Escape to close (if applicable)

**Expected Results:**
- ✅ Focus indicators visible
- ✅ Keyboard navigation works
- ✅ Enter activates buttons
- ✅ Accessible for keyboard users

### Test 9: Multiple Custom Themes
**Steps:**
1. Create 3 different custom themes
2. Switch between them
3. Check all appear in presets dialog

**Expected Results:**
- ✅ All custom themes saved
- ✅ Each has unique colors
- ✅ Can switch freely between them
- ✅ Each theme ID is unique

### Test 10: Edge Cases
**Test invalid input:**
1. Try creating theme with very long name
2. Try importing invalid JSON file
3. Try importing file with missing colors

**Expected Results:**
- ✅ Long names are handled gracefully
- ✅ Invalid JSON shows error message
- ✅ Missing colors use safe defaults
- ✅ No crashes or undefined behavior

## Visual Verification Checklist

When a theme is applied, verify these elements update:
- [ ] Menu bar background and text
- [ ] Toolbar background and borders
- [ ] Left panel (Tools)
- [ ] Right panel (Layers)
- [ ] Button backgrounds and hover states
- [ ] Text color throughout UI
- [ ] Border colors on all panels
- [ ] Accent color on active elements

## Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

All features should work identically across browsers.

## Performance Checks

- [ ] Theme switching is instant (< 100ms)
- [ ] No UI lag when opening dialogs
- [ ] Color picker responds immediately
- [ ] Live preview updates smoothly
- [ ] No memory leaks with multiple switches

## Known Limitations

1. **Icon packs**: Not implemented (future feature)
2. **Cloud sync**: Not implemented (requires backend)
3. **Browser menu**: May need manual refresh for some menu items

## Reporting Issues

If you find any issues:
1. Note the browser/mode (Electron vs Browser)
2. Describe the steps to reproduce
3. Include console errors (F12 → Console)
4. Note the theme being used
5. Include screenshot if visual issue

## Success Criteria

All tests should pass with:
- ✅ 0 console errors
- ✅ Smooth UI transitions
- ✅ Persistent storage working
- ✅ All colors updating correctly
- ✅ Import/export functioning
- ✅ Security (no XSS warnings)

---

**Happy Testing!**

If all tests pass, the custom theme system is production-ready. 🎉
