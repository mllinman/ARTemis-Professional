# Phase 12 & 14 Features - Animation and Cloud Sync

This document describes the newly implemented Phase 12 (Animation & Recording) and Phase 14 (Cloud & Collaboration) features in ARTemis Professional.

---

## 🎬 Phase 12: Animation & Recording Features

### Overview

ARTemis now includes a comprehensive animation system that allows you to create frame-by-frame animations, record your painting sessions, and export animations in various formats.

### Animation System

#### Core Modules

1. **animation.js** - Core animation system
2. **animation-ui.js** - User interface for animation controls
3. **session-recorder.js** - Session recording and playback

#### Features Implemented

##### 1. Frame-by-Frame Animation

- **Add/Delete Frames**: Create and manage animation frames
- **Duplicate Frames**: Copy existing frames for easier animation workflow
- **Frame Navigation**: Move between frames with next/previous controls
- **Timeline Interface**: Visual timeline showing all frames with thumbnails
- **Frame Rate Control**: Adjustable from 1 to 60 FPS

##### 2. Onion Skinning

- **Toggle On/Off**: Show/hide onion skin layers
- **Configurable Depth**: Control how many frames before/after to display
- **Opacity Control**: Adjust transparency of onion skin layers
- **Previous/Next Frames**: Different opacity for past and future frames

##### 3. Animation Playback

- **Play/Stop Controls**: Preview your animation
- **Speed Control**: Adjust playback speed
- **Loop Animation**: Continuous playback

##### 4. Animation Export

**GIF Export**
```javascript
// Requires gif.js library to be loaded
const blob = await animationSystem.exportAsGIF(canvasRenderer, {
    width: 800,
    height: 600,
    quality: 10,
    repeat: 0, // 0 = loop forever
    onProgress: (current, total) => {
        console.log(`Exporting: ${current}/${total}`);
    }
});
```

**Frame Sequence Export**
```javascript
// Export individual PNG frames
const frames = await animationSystem.exportAsFrameSequence(canvasRenderer, {
    format: 'png',
    quality: 0.9,
    prefix: 'frame',
    onProgress: (current, total) => {
        console.log(`Exporting: ${current}/${total}`);
    }
});
```

**Sprite Sheet Export**
```javascript
// Export all frames as a sprite sheet
const { canvas, metadata } = await animationSystem.exportAsSpriteSheet(canvasRenderer, {
    columns: 4,
    frameWidth: 200,
    frameHeight: 150,
    spacing: 0,
    onProgress: (current, total) => {
        console.log(`Generating sprite sheet: ${current}/${total}`);
    }
});
```

##### 5. Session Recording

**Start/Stop Recording**
```javascript
const recorder = new SessionRecorder();
recorder.startRecording(canvas);

// Record actions
recorder.recordBrushStroke('brush', points, settings);
recorder.recordLayerOperation('add', layerData);
recorder.recordTransform(transformData);

// Stop recording
const stats = recorder.stopRecording();
console.log(`Recorded ${stats.actionCount} actions in ${stats.duration}ms`);
```

**Playback**
```javascript
// Playback recorded session
await recorder.playback(canvas, ctx, (current, total, action) => {
    console.log(`Playing action ${current}/${total}`);
}, 1.0); // 1.0 = normal speed
```

**Video Export**
```javascript
// Export session as video
const videoBlob = await recorder.exportAsVideo(canvas, {
    mimeType: 'video/webm',
    videoBitsPerSecond: 2500000,
    onProgress: (current, total) => {
        console.log(`Recording video: ${current}/${total}`);
    }
});
```

**Time-lapse Creation**
```javascript
// Create time-lapse with target duration
const timelapseBlob = await recorder.createTimeLapse(canvas, ctx, {
    targetDuration: 30000, // 30 seconds
    onProgress: (current, total) => {
        console.log(`Creating time-lapse: ${current}/${total}`);
    }
});
```

##### 6. Macro System

**Record/Replay Macros**
```javascript
// Start recording a macro
recorder.startMacro('My Macro');

// Perform actions...

// Stop and save macro
const macro = recorder.stopMacro();

// Replay macro on specific layers
await recorder.replayMacro(macro, targetLayers, (current, total) => {
    console.log(`Replaying action ${current}/${total}`);
});
```

### Usage Example

```javascript
// Initialize animation system
const animationSystem = new AnimationSystem();
const animationUI = new AnimationUI(animationSystem);

// Show animation panel
animationUI.show();

// Set up frame change callback
animationUI.onFrameChange((frameIndex, frame) => {
    // Update canvas with frame data
    console.log(`Frame changed to: ${frameIndex}`);
});

// Add a new frame
animationSystem.addFrame(currentLayerData);
animationUI.updateTimeline();

// Play animation
animationSystem.play((frameIndex, frame) => {
    // Render frame
});
```

---

## ☁️ Phase 14: Cloud & Collaboration Features

### Overview

ARTemis now includes a client-side cloud sync system using IndexedDB for local storage, providing project backup, version history, and data synchronization capabilities.

### Cloud Sync System

#### Core Modules

1. **cloud-sync.js** - Core cloud sync system with IndexedDB
2. **cloud-sync-ui.js** - User interface for cloud sync controls

#### Features Implemented

##### 1. Project Management

**Save Projects with Version History**
```javascript
const cloudSync = new CloudSync();
await cloudSync.initDB();

// Save a project
const projectId = await cloudSync.saveProject({
    name: 'My Artwork',
    data: projectData,
    // Additional metadata
});

// Load a project
const project = await cloudSync.loadProject(projectId);

// Get all projects
const projects = await cloudSync.getAllProjects();

// Delete a project
await cloudSync.deleteProject(projectId);
```

**Version History**
```javascript
// Get project history (up to 10 versions)
const history = await cloudSync.getProjectHistory(projectId);

// Each version includes:
// - timestamp
// - full project data
// - project ID
```

##### 2. Settings Sync

**Sync Application Settings**
```javascript
// Save settings
await cloudSync.syncSettings({
    theme: 'dark',
    brushPresets: [...],
    keyboardShortcuts: {...},
    // Any app settings
});

// Load settings
const settings = await cloudSync.loadSettings();
```

##### 3. Brush Library Sync

**Sync Custom Brushes**
```javascript
// Sync brushes
await cloudSync.syncBrushes([
    { id: 'brush1', name: 'My Brush', settings: {...} },
    { id: 'brush2', name: 'Another Brush', settings: {...} },
]);

// Load brushes
const brushes = await cloudSync.loadBrushes();
```

##### 4. Workspace Management

**Sync Workspace Layouts**
```javascript
// Save workspace
await cloudSync.syncWorkspace({
    id: 'painting-workspace',
    name: 'Painting Layout',
    panelPositions: {...},
    // Layout data
});

// Load workspace
const workspace = await cloudSync.loadWorkspace('painting-workspace');

// Get all workspaces
const workspaces = await cloudSync.getAllWorkspaces();
```

##### 5. Auto-Sync

**Enable Automatic Synchronization**
```javascript
// Enable auto-sync with callback
cloudSync.enableAutoSync(async () => {
    // Sync logic - called every 30 seconds by default
    await cloudSync.syncSettings(currentSettings);
    await cloudSync.saveProject(currentProject);
});

// Disable auto-sync
cloudSync.disableAutoSync();
```

##### 6. Share Links

**Generate Shareable Links**
```javascript
// Generate share link for a project
const shareLink = await cloudSync.generateShareLink(projectId);
// Returns: https://yourapp.com?share=abc123

// Load project from share link
const sharedProject = await cloudSync.loadFromShareLink('abc123');
```

##### 7. Backup & Restore

**Export/Import All Data**
```javascript
// Export all data as JSON
const backupData = await cloudSync.exportAllData();

// Save to file
const blob = new Blob([backupData], { type: 'application/json' });
// Download blob...

// Import data from backup
const success = await cloudSync.importAllData(jsonData);
```

##### 8. Storage Statistics

**Monitor Storage Usage**
```javascript
// Get sync statistics
const stats = await cloudSync.getSyncStats();
console.log(stats);
// {
//   lastSyncTime: 1234567890,
//   syncEnabled: true,
//   projectCount: 10,
//   brushCount: 50,
//   workspaceCount: 3,
//   storageUsed: { usage: 5242880, quota: 52428800, percentUsed: '10.00' }
// }
```

### Usage Example

```javascript
// Initialize cloud sync
const cloudSync = new CloudSync();
const cloudSyncUI = new CloudSyncUI(cloudSync);

// Initialize database
await cloudSync.initDB();

// Show cloud sync panel
cloudSyncUI.show();

// Save current project
const projectId = await cloudSync.saveProject({
    id: currentProjectId || Date.now().toString(),
    name: projectName,
    data: {
        layers: layers,
        canvas: canvasData,
        settings: projectSettings
    }
});

// Enable auto-sync
cloudSync.enableAutoSync(async () => {
    await cloudSync.syncSettings(appSettings);
    await cloudSync.saveProject(currentProject);
});

// Set up project load callback
cloudSyncUI.onProjectLoad(async (projectId) => {
    const project = await cloudSync.loadProject(projectId);
    // Load project into application
    loadProject(project);
});
```

---

## Integration with ARTemis

### Adding to HTML

To integrate these features into ARTemis, add the following scripts to `index.html`:

```html
<!-- Animation System -->
<script src="animation.js"></script>
<script src="animation-ui.js"></script>
<script src="session-recorder.js"></script>

<!-- Cloud Sync System -->
<script src="cloud-sync.js"></script>
<script src="cloud-sync-ui.js"></script>

<!-- Optional: GIF.js for GIF export -->
<script src="https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js"></script>
```

### Menu Integration

Add menu items to access these features:

```javascript
// Animation menu item
{
    label: 'Animation',
    submenu: [
        {
            label: 'Show Animation Timeline',
            accelerator: 'CmdOrCtrl+Alt+A',
            click: () => { animationUI.show(); }
        },
        {
            label: 'Add Frame',
            accelerator: 'CmdOrCtrl+Alt+F',
            click: () => { animationUI.addFrame(); }
        },
        {
            label: 'Toggle Onion Skin',
            accelerator: 'CmdOrCtrl+Alt+O',
            click: () => { animationUI.toggleOnionSkin(); }
        }
    ]
}

// Cloud sync menu item
{
    label: 'Cloud',
    submenu: [
        {
            label: 'Cloud Sync Panel',
            accelerator: 'CmdOrCtrl+Alt+C',
            click: () => { cloudSyncUI.show(); }
        },
        {
            label: 'Sync Now',
            accelerator: 'CmdOrCtrl+Alt+S',
            click: () => { cloudSyncUI.syncNow(); }
        },
        {
            label: 'Export Backup',
            click: () => { cloudSyncUI.exportBackup(); }
        }
    ]
}
```

---

## Dependencies

### Optional Dependencies

- **gif.js** (v0.2.0+) - Required for GIF export functionality
  - Can be loaded from CDN: `https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js`
  - Or installed via npm: `npm install gif.js`

### Browser Support

- **IndexedDB** - For cloud sync storage (all modern browsers)
- **MediaRecorder API** - For video recording (Chrome, Firefox, Edge)
- **File System Access API** - For improved file handling (Chrome, Edge)
- **Canvas API** - For rendering (all modern browsers)

---

## Limitations & Future Enhancements

### Current Limitations

1. **Cloud Sync**: Currently client-side only using IndexedDB
   - Data is stored locally in the browser
   - No actual cloud server integration
   - Share links use base64 encoding (size limited)

2. **GIF Export**: Requires gif.js library to be loaded
   - Not included by default
   - Large animations may be slow to encode

3. **Video Recording**: Limited by MediaRecorder API support
   - WebM format most widely supported
   - MP4 support varies by browser

4. **Real-time Collaboration**: Not implemented
   - Would require WebSocket server
   - Would require conflict resolution system

### Future Enhancements

1. **Server Integration**
   - Real cloud storage with API
   - User authentication
   - Cross-device sync

2. **Advanced Collaboration**
   - Real-time collaborative editing
   - Comments and annotations
   - Team workspaces

3. **Animation Improvements**
   - More export formats
   - Better frame interpolation
   - Audio support for videos

4. **Performance Optimization**
   - WebGL-accelerated animation rendering
   - Lazy loading for large animations
   - Background processing for exports

---

## Testing

### Animation System

1. Open ARTemis
2. Show animation timeline: Menu → Animation → Show Animation Timeline
3. Add frames using the "Add Frame" button
4. Draw on canvas and switch between frames
5. Enable onion skinning to see previous/next frames
6. Play animation to preview
7. Export as GIF, frame sequence, or sprite sheet

### Cloud Sync

1. Open ARTemis
2. Show cloud sync panel: Menu → Cloud → Cloud Sync Panel
3. Create a project and save it
4. Check that project appears in the projects list
5. Enable auto-sync
6. Make changes and verify they're saved automatically
7. Export backup to JSON file
8. Import backup to restore data

### Session Recording

1. Start recording: `recorder.startRecording(canvas)`
2. Paint on canvas
3. Stop recording: `recorder.stopRecording()`
4. Play back recording: `recorder.playback(canvas, ctx)`
5. Export as video or time-lapse

---

## API Documentation

### AnimationSystem Class

```javascript
class AnimationSystem {
    constructor()
    addFrame(layerData)
    deleteFrame(index)
    duplicateFrame(index)
    setCurrentFrame(index)
    nextFrame()
    prevFrame()
    play(onFrameChange)
    stop()
    setFrameRate(fps)
    toggleOnionSkin()
    getOnionSkinFrames()
    async exportAsGIF(canvasRenderer, options)
    async exportAsFrameSequence(canvasRenderer, options)
    async exportAsSpriteSheet(canvasRenderer, options)
    saveToJSON()
    loadFromJSON(json)
    clear()
}
```

### SessionRecorder Class

```javascript
class SessionRecorder {
    constructor()
    startRecording(canvas)
    stopRecording()
    recordAction(action)
    recordBrushStroke(tool, points, settings)
    recordLayerOperation(operation, layerData)
    recordTransform(transform)
    async playback(canvas, ctx, onProgress, speed)
    async exportAsVideo(canvas, options)
    async createTimeLapse(canvas, ctx, options)
    saveToJSON()
    loadFromJSON(json)
    clear()
    getStats()
    startMacro(name)
    stopMacro()
    async replayMacro(macro, targetLayers, onProgress)
}
```

### CloudSync Class

```javascript
class CloudSync {
    constructor()
    async initDB()
    async saveToStore(storeName, data)
    async getFromStore(storeName, key)
    async getAllFromStore(storeName)
    async deleteFromStore(storeName, key)
    async syncSettings(settings)
    async loadSettings()
    async saveProject(project)
    async loadProject(projectId)
    async getAllProjects()
    async deleteProject(projectId)
    async getProjectHistory(projectId)
    async syncBrushes(brushes)
    async loadBrushes()
    async syncWorkspace(workspace)
    async loadWorkspace(workspaceId)
    async getAllWorkspaces()
    enableAutoSync(syncCallback)
    disableAutoSync()
    async generateShareLink(projectId)
    async loadFromShareLink(shareId)
    async exportAllData()
    async importAllData(jsonData)
    async getSyncStats()
}
```

---

## Support

For issues or questions:
1. Check this documentation
2. Review the source code comments
3. Open an issue on GitHub

---

**Status**: Phase 12 and 14 features are now available for integration into ARTemis Professional.

**Last Updated**: October 2025
