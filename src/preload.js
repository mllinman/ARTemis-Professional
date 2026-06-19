/**
 * ARTemis Professional - Electron Preload Script
 * 
 * Securely exposes IPC channels to the renderer process via contextBridge.
 * This is the ONLY bridge between Node.js and the browser context.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Whitelist of allowed IPC channels for security
const ALLOWED_SEND_CHANNELS = [
    'load-brush-texture',
    'import-brushes',
];

const ALLOWED_INVOKE_CHANNELS = [
    'show-save-dialog',
    'show-open-dialog',
    'save-file',
    'read-file',
    'save-binary-file',
];

const ALLOWED_RECEIVE_CHANNELS = [
    // File operations
    'file-new', 'file-new-with-size', 'file-open', 'file-save', 'file-save-as',
    'file-export', 'file-import-svg', 'file-export-svg', 'file-settings',
    // Edit
    'edit-undo', 'edit-redo',
    // View
    'view-zoom-in', 'view-zoom-out', 'view-fit',
    // Layers
    'layer-new', 'layer-duplicate', 'layer-delete',
    'layer-move-up', 'layer-move-down', 'layer-merge', 'layer-flatten',
    // Tools
    'tool-brush', 'tool-eraser', 'tool-fill', 'tool-eyedropper',
    'tool-selection', 'tool-text', 'tool-pen', 'tool-shapes',
    'tool-gradient', 'tool-move', 'tool-rotate', 'tool-scale',
    'tool-crop', 'tool-clone', 'tool-dodge', 'tool-burn', 'tool-sponge',
    // Path
    'path-union', 'path-subtract', 'path-intersect', 'path-exclude', 'path-text-on-path',
    // Filters
    'filter-brightness', 'filter-blur', 'filter-gaussian-blur',
    'filter-motion-blur', 'filter-radial-blur', 'filter-sharpen',
    'filter-add-noise', 'filter-reduce-noise',
    'filter-oil-painting', 'filter-watercolor', 'filter-posterize', 'filter-mosaic',
    'filter-grayscale', 'filter-invert', 'filter-hue-saturation',
    'filter-pinch-bulge', 'filter-twirl', 'filter-wave',
    // Image
    'image-flip-horizontal', 'image-flip-vertical',
    // Workspace
    'workspace-save', 'workspace-load', 'workspace-manage', 'workspace-preset',
    'shortcuts-customize', 'theme-toggle', 'theme-presets', 'interface-scale-dialog',
    // Windows
    'window-toggle-panel', 'window-save-layout', 'window-load-layout', 'window-reset-panels',
    // Animation
    'animation-show-timeline', 'animation-add-frame', 'animation-duplicate-frame',
    'animation-delete-frame', 'animation-play', 'animation-stop',
    'animation-toggle-onion-skin', 'animation-export-gif',
    'animation-export-frames', 'animation-export-spritesheet',
    'recording-start', 'recording-stop',
    // Cloud
    'cloud-show-panel', 'cloud-sync-now', 'cloud-toggle-auto-sync',
    'cloud-export-backup', 'cloud-import-backup', 'cloud-generate-share-link',
    // Photo editing
    'photo-frequency-separation', 'photo-patch-tool', 'photo-healing-brush',
    'photo-red-eye-removal', 'photo-teeth-whitening', 'photo-skin-tone',
    'photo-lens-profile', 'photo-chromatic-aberration', 'photo-perspective', 'photo-wide-angle',
    'photo-raw-development', 'photo-hdr-merge', 'photo-panorama-stitch', 'photo-batch-raw',
    // Automation
    'auto-action-record', 'auto-action-stop', 'auto-action-play', 'auto-action-edit',
    'auto-batch-process', 'auto-create-droplet',
    'auto-run-script', 'auto-manage-plugins', 'auto-event-hooks',
    'auto-new-from-template', 'auto-save-template', 'auto-asset-library',
    // Help
    'help-about',
    // Brush data
    'brush-texture-loaded', 'brushes-imported',
];

contextBridge.exposeInMainWorld('electronAPI', {
    // Invoke (request-response) — for dialogs and file operations
    invoke: (channel, ...args) => {
        if (ALLOWED_INVOKE_CHANNELS.includes(channel)) {
            return ipcRenderer.invoke(channel, ...args);
        }
        console.warn(`[Preload] Blocked invoke on unauthorized channel: ${channel}`);
        return Promise.reject(new Error(`Channel "${channel}" is not allowed`));
    },

    // Send (fire-and-forget) — for one-way messages to main
    send: (channel, ...args) => {
        if (ALLOWED_SEND_CHANNELS.includes(channel)) {
            ipcRenderer.send(channel, ...args);
        } else {
            console.warn(`[Preload] Blocked send on unauthorized channel: ${channel}`);
        }
    },

    // On (receive) — for messages from main process
    on: (channel, callback) => {
        if (ALLOWED_RECEIVE_CHANNELS.includes(channel)) {
            const subscription = (_event, ...args) => callback(...args);
            ipcRenderer.on(channel, subscription);
            // Return cleanup function
            return () => ipcRenderer.removeListener(channel, subscription);
        }
        console.warn(`[Preload] Blocked listener on unauthorized channel: ${channel}`);
        return () => {};
    },

    // Platform info
    platform: process.platform,
    isElectron: true,
});
