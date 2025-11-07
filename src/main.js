const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#1e1e1e',
    title: 'ARTemis - Professional Digital Painting (Alpha)',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    show: false
  });

  mainWindow.loadFile('src/index.html');
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Create application menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => { mainWindow.webContents.send('file-new'); }
        },
        {
          label: 'New with Size...',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => { mainWindow.webContents.send('file-new-with-size'); }
        },
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+O',
          click: () => { mainWindow.webContents.send('file-open'); }
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => { mainWindow.webContents.send('file-save'); }
        },
        {
          label: 'Save As',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => { mainWindow.webContents.send('file-save-as'); }
        },
        { type: 'separator' },
        {
          label: 'Export',
          accelerator: 'CmdOrCtrl+E',
          click: () => { mainWindow.webContents.send('file-export'); }
        },
        {
          label: 'Import SVG...',
          click: () => { mainWindow.webContents.send('file-import-svg'); }
        },
        {
          label: 'Export as SVG...',
          click: () => { mainWindow.webContents.send('file-export-svg'); }
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => { mainWindow.webContents.send('file-settings'); }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => { mainWindow.webContents.send('edit-undo'); }
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Shift+Z',
          click: () => { mainWindow.webContents.send('edit-redo'); }
        },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'Path',
      submenu: [
        {
          label: 'Union (Combine Shapes)',
          click: () => { mainWindow.webContents.send('path-union'); }
        },
        {
          label: 'Subtract (Cut Out)',
          click: () => { mainWindow.webContents.send('path-subtract'); }
        },
        {
          label: 'Intersect (Keep Overlap)',
          click: () => { mainWindow.webContents.send('path-intersect'); }
        },
        {
          label: 'Exclude (Remove Overlap)',
          click: () => { mainWindow.webContents.send('path-exclude'); }
        },
        { type: 'separator' },
        {
          label: 'Text on Path...',
          click: () => { mainWindow.webContents.send('path-text-on-path'); }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => { mainWindow.webContents.send('view-zoom-in'); }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => { mainWindow.webContents.send('view-zoom-out'); }
        },
        {
          label: 'Fit to Screen',
          accelerator: 'CmdOrCtrl+0',
          click: () => { mainWindow.webContents.send('view-fit'); }
        },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Layer',
      submenu: [
        {
          label: 'New Layer',
          accelerator: 'CmdOrCtrl+Shift+L',
          click: () => { mainWindow.webContents.send('layer-new'); }
        },
        {
          label: 'Duplicate Layer',
          accelerator: 'CmdOrCtrl+J',
          click: () => { mainWindow.webContents.send('layer-duplicate'); }
        },
        {
          label: 'Delete Layer',
          accelerator: 'Delete',
          click: () => { mainWindow.webContents.send('layer-delete'); }
        },
        { type: 'separator' },
        {
          label: 'Move Layer Up',
          accelerator: 'CmdOrCtrl+]',
          click: () => { mainWindow.webContents.send('layer-move-up'); }
        },
        {
          label: 'Move Layer Down',
          accelerator: 'CmdOrCtrl+[',
          click: () => { mainWindow.webContents.send('layer-move-down'); }
        },
        { type: 'separator' },
        {
          label: 'Merge Down',
          accelerator: 'CmdOrCtrl+E',
          click: () => { mainWindow.webContents.send('layer-merge'); }
        },
        {
          label: 'Flatten All Layers',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => { mainWindow.webContents.send('layer-flatten'); }
        }
      ]
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Brush',
          accelerator: 'B',
          click: () => { mainWindow.webContents.send('tool-brush'); }
        },
        {
          label: 'Eraser',
          accelerator: 'E',
          click: () => { mainWindow.webContents.send('tool-eraser'); }
        },
        {
          label: 'Fill',
          accelerator: 'G',
          click: () => { mainWindow.webContents.send('tool-fill'); }
        },
        {
          label: 'Eyedropper',
          accelerator: 'I',
          click: () => { mainWindow.webContents.send('tool-eyedropper'); }
        },
        {
          label: 'Selection',
          accelerator: 'M',
          click: () => { mainWindow.webContents.send('tool-selection'); }
        },
        {
          label: 'Text',
          accelerator: 'T',
          click: () => { mainWindow.webContents.send('tool-text'); }
        },
        {
          label: 'Pen Tool',
          accelerator: 'P',
          click: () => { mainWindow.webContents.send('tool-pen'); }
        },
        {
          label: 'Shapes',
          accelerator: 'S',
          click: () => { mainWindow.webContents.send('tool-shapes'); }
        },
        {
          label: 'Gradient',
          accelerator: 'L',
          click: () => { mainWindow.webContents.send('tool-gradient'); }
        },
        { type: 'separator' },
        {
          label: 'Move',
          accelerator: 'V',
          click: () => { mainWindow.webContents.send('tool-move'); }
        },
        {
          label: 'Rotate',
          accelerator: 'R',
          click: () => { mainWindow.webContents.send('tool-rotate'); }
        },
        {
          label: 'Scale',
          accelerator: 'Z',
          click: () => { mainWindow.webContents.send('tool-scale'); }
        },
        { type: 'separator' },
        {
          label: 'Crop',
          accelerator: 'C',
          click: () => { mainWindow.webContents.send('tool-crop'); }
        },
        {
          label: 'Clone Stamp',
          accelerator: 'K',
          click: () => { mainWindow.webContents.send('tool-clone'); }
        },
        {
          label: 'Dodge (Lighten)',
          accelerator: 'O',
          click: () => { mainWindow.webContents.send('tool-dodge'); }
        },
        {
          label: 'Burn (Darken)',
          accelerator: 'U',
          click: () => { mainWindow.webContents.send('tool-burn'); }
        },
        {
          label: 'Sponge (Saturation)',
          accelerator: 'P',
          click: () => { mainWindow.webContents.send('tool-sponge'); }
        }
      ]
    },
    {
      label: 'Filters',
      submenu: [
        {
          label: 'Brightness/Contrast',
          click: () => { mainWindow.webContents.send('filter-brightness'); }
        },
        {
          label: 'Blur',
          submenu: [
            {
              label: 'Box Blur',
              click: () => { mainWindow.webContents.send('filter-blur'); }
            },
            {
              label: 'Gaussian Blur',
              click: () => { mainWindow.webContents.send('filter-gaussian-blur'); }
            },
            {
              label: 'Motion Blur',
              click: () => { mainWindow.webContents.send('filter-motion-blur'); }
            },
            {
              label: 'Radial Blur',
              click: () => { mainWindow.webContents.send('filter-radial-blur'); }
            }
          ]
        },
        {
          label: 'Sharpen',
          click: () => { mainWindow.webContents.send('filter-sharpen'); }
        },
        {
          label: 'Noise',
          submenu: [
            {
              label: 'Add Noise',
              click: () => { mainWindow.webContents.send('filter-add-noise'); }
            },
            {
              label: 'Reduce Noise',
              click: () => { mainWindow.webContents.send('filter-reduce-noise'); }
            }
          ]
        },
        { type: 'separator' },
        {
          label: 'Artistic',
          submenu: [
            {
              label: 'Oil Painting',
              click: () => { mainWindow.webContents.send('filter-oil-painting'); }
            },
            {
              label: 'Watercolor',
              click: () => { mainWindow.webContents.send('filter-watercolor'); }
            },
            {
              label: 'Posterize',
              click: () => { mainWindow.webContents.send('filter-posterize'); }
            },
            {
              label: 'Mosaic',
              click: () => { mainWindow.webContents.send('filter-mosaic'); }
            }
          ]
        },
        { type: 'separator' },
        {
          label: 'Color',
          submenu: [
            {
              label: 'Grayscale',
              click: () => { mainWindow.webContents.send('filter-grayscale'); }
            },
            {
              label: 'Invert',
              click: () => { mainWindow.webContents.send('filter-invert'); }
            },
            {
              label: 'Hue/Saturation',
              click: () => { mainWindow.webContents.send('filter-hue-saturation'); }
            }
          ]
        },
        { type: 'separator' },
        {
          label: 'Distort',
          submenu: [
            {
              label: 'Pinch/Bulge',
              click: () => { mainWindow.webContents.send('filter-pinch-bulge'); }
            },
            {
              label: 'Twirl',
              click: () => { mainWindow.webContents.send('filter-twirl'); }
            },
            {
              label: 'Wave',
              click: () => { mainWindow.webContents.send('filter-wave'); }
            }
          ]
        }
      ]
    },
    {
      label: 'Image',
      submenu: [
        {
          label: 'Flip Horizontal',
          click: () => { mainWindow.webContents.send('image-flip-horizontal'); }
        },
        {
          label: 'Flip Vertical',
          click: () => { mainWindow.webContents.send('image-flip-vertical'); }
        }
      ]
    },
    {
      label: 'Workspace',
      submenu: [
        {
          label: 'Save Workspace',
          accelerator: 'CmdOrCtrl+Shift+W',
          click: () => { mainWindow.webContents.send('workspace-save'); }
        },
        {
          label: 'Load Workspace',
          accelerator: 'CmdOrCtrl+Alt+W',
          click: () => { mainWindow.webContents.send('workspace-load'); }
        },
        {
          label: 'Manage Workspaces',
          click: () => { mainWindow.webContents.send('workspace-manage'); }
        },
        { type: 'separator' },
        {
          label: 'Workspace Presets',
          submenu: [
            {
              label: 'Painting',
              click: () => { mainWindow.webContents.send('workspace-preset', 'painting'); }
            },
            {
              label: 'Illustration',
              click: () => { mainWindow.webContents.send('workspace-preset', 'illustration'); }
            },
            {
              label: 'Photo Editing',
              click: () => { mainWindow.webContents.send('workspace-preset', 'photo-editing'); }
            },
            {
              label: 'Minimal',
              click: () => { mainWindow.webContents.send('workspace-preset', 'minimal'); }
            }
          ]
        },
        { type: 'separator' },
        {
          label: 'Customize Keyboard Shortcuts',
          click: () => { mainWindow.webContents.send('shortcuts-customize'); }
        },
        {
          label: 'Toggle Theme (Light/Dark)',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => { mainWindow.webContents.send('theme-toggle'); }
        },
        {
          label: 'Theme Presets...',
          click: () => { mainWindow.webContents.send('theme-presets'); }
        },
        {
          label: 'Interface Scale...',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => { mainWindow.webContents.send('interface-scale-dialog'); }
        }
      ]
    },
    {
      label: 'Windows',
      submenu: [
        {
          label: 'Show/Hide Panels',
          type: 'separator'
        },
        {
          label: 'Left Panel (Tools)',
          type: 'checkbox',
          checked: true,
          click: (menuItem) => { 
            mainWindow.webContents.send('window-toggle-panel', 'left', menuItem.checked); 
          }
        },
        {
          label: 'Right Panel (Layers)',
          type: 'checkbox',
          checked: true,
          click: (menuItem) => { 
            mainWindow.webContents.send('window-toggle-panel', 'right', menuItem.checked); 
          }
        },
        { type: 'separator' },
        {
          label: 'Layout',
          type: 'separator'
        },
        {
          label: 'Save Panel Layout',
          accelerator: 'CmdOrCtrl+Alt+S',
          click: () => { mainWindow.webContents.send('window-save-layout'); }
        },
        {
          label: 'Load Panel Layout',
          accelerator: 'CmdOrCtrl+Alt+L',
          click: () => { mainWindow.webContents.send('window-load-layout'); }
        },
        {
          label: 'Reset to Default Layout',
          accelerator: 'CmdOrCtrl+Alt+R',
          click: () => { mainWindow.webContents.send('window-reset-panels'); }
        }
      ]
    },
    {
      label: 'Animation',
      submenu: [
        {
          label: 'Show Animation Timeline',
          accelerator: 'CmdOrCtrl+Alt+A',
          click: () => { mainWindow.webContents.send('animation-show-timeline'); }
        },
        {
          label: 'Add Frame',
          accelerator: 'CmdOrCtrl+Alt+F',
          click: () => { mainWindow.webContents.send('animation-add-frame'); }
        },
        {
          label: 'Duplicate Frame',
          click: () => { mainWindow.webContents.send('animation-duplicate-frame'); }
        },
        {
          label: 'Delete Frame',
          click: () => { mainWindow.webContents.send('animation-delete-frame'); }
        },
        { type: 'separator' },
        {
          label: 'Play Animation',
          accelerator: 'CmdOrCtrl+Alt+P',
          click: () => { mainWindow.webContents.send('animation-play'); }
        },
        {
          label: 'Stop Animation',
          click: () => { mainWindow.webContents.send('animation-stop'); }
        },
        { type: 'separator' },
        {
          label: 'Toggle Onion Skin',
          accelerator: 'CmdOrCtrl+Alt+O',
          click: () => { mainWindow.webContents.send('animation-toggle-onion-skin'); }
        },
        { type: 'separator' },
        {
          label: 'Export as GIF...',
          click: () => { mainWindow.webContents.send('animation-export-gif'); }
        },
        {
          label: 'Export Frame Sequence...',
          click: () => { mainWindow.webContents.send('animation-export-frames'); }
        },
        {
          label: 'Export Sprite Sheet...',
          click: () => { mainWindow.webContents.send('animation-export-spritesheet'); }
        },
        { type: 'separator' },
        {
          label: 'Start Recording',
          accelerator: 'CmdOrCtrl+Alt+R',
          click: () => { mainWindow.webContents.send('recording-start'); }
        },
        {
          label: 'Stop Recording',
          click: () => { mainWindow.webContents.send('recording-stop'); }
        }
      ]
    },
    {
      label: 'Cloud',
      submenu: [
        {
          label: 'Cloud Sync Panel',
          accelerator: 'CmdOrCtrl+Alt+C',
          click: () => { mainWindow.webContents.send('cloud-show-panel'); }
        },
        {
          label: 'Sync Now',
          accelerator: 'CmdOrCtrl+Alt+S',
          click: () => { mainWindow.webContents.send('cloud-sync-now'); }
        },
        {
          label: 'Enable Auto-Sync',
          click: () => { mainWindow.webContents.send('cloud-toggle-auto-sync'); }
        },
        { type: 'separator' },
        {
          label: 'Export Backup...',
          click: () => { mainWindow.webContents.send('cloud-export-backup'); }
        },
        {
          label: 'Import Backup...',
          click: () => { mainWindow.webContents.send('cloud-import-backup'); }
        },
        { type: 'separator' },
        {
          label: 'Generate Share Link',
          click: () => { mainWindow.webContents.send('cloud-generate-share-link'); }
        }
      ]
    },
    {
      label: 'Photo Editing',
      submenu: [
        {
          label: 'Professional Retouching',
          submenu: [
            {
              label: 'Frequency Separation...',
              click: () => { mainWindow.webContents.send('photo-frequency-separation'); }
            },
            {
              label: 'Patch Tool',
              click: () => { mainWindow.webContents.send('photo-patch-tool'); }
            },
            {
              label: 'Healing Brush Pro',
              click: () => { mainWindow.webContents.send('photo-healing-brush'); }
            },
            {
              label: 'Red Eye / Pet Eye Removal',
              click: () => { mainWindow.webContents.send('photo-red-eye-removal'); }
            },
            {
              label: 'Teeth Whitening',
              click: () => { mainWindow.webContents.send('photo-teeth-whitening'); }
            },
            {
              label: 'Skin Tone Enhancement...',
              click: () => { mainWindow.webContents.send('photo-skin-tone'); }
            }
          ]
        },
        {
          label: 'Lens Corrections',
          submenu: [
            {
              label: 'Lens Profile Corrections...',
              click: () => { mainWindow.webContents.send('photo-lens-profile'); }
            },
            {
              label: 'Fix Chromatic Aberration',
              click: () => { mainWindow.webContents.send('photo-chromatic-aberration'); }
            },
            {
              label: 'Perspective Correction...',
              click: () => { mainWindow.webContents.send('photo-perspective'); }
            },
            {
              label: 'Adaptive Wide Angle...',
              click: () => { mainWindow.webContents.send('photo-wide-angle'); }
            }
          ]
        },
        {
          label: 'RAW Processing',
          submenu: [
            {
              label: 'RAW Development Controls...',
              click: () => { mainWindow.webContents.send('photo-raw-development'); }
            },
            {
              label: 'HDR Merge...',
              click: () => { mainWindow.webContents.send('photo-hdr-merge'); }
            },
            {
              label: 'Panorama Stitching...',
              click: () => { mainWindow.webContents.send('photo-panorama-stitch'); }
            },
            {
              label: 'Batch RAW Processing...',
              click: () => { mainWindow.webContents.send('photo-batch-raw'); }
            }
          ]
        }
      ]
    },
    {
      label: 'Automation',
      submenu: [
        {
          label: 'Actions & Macros',
          submenu: [
            {
              label: 'Record Action...',
              accelerator: 'CmdOrCtrl+Shift+R',
              click: () => { mainWindow.webContents.send('auto-action-record'); }
            },
            {
              label: 'Stop Recording',
              accelerator: 'CmdOrCtrl+Shift+T',
              click: () => { mainWindow.webContents.send('auto-action-stop'); }
            },
            {
              label: 'Play Action...',
              accelerator: 'CmdOrCtrl+Shift+P',
              click: () => { mainWindow.webContents.send('auto-action-play'); }
            },
            {
              label: 'Edit Action...',
              click: () => { mainWindow.webContents.send('auto-action-edit'); }
            },
            {
              label: 'Batch Processing...',
              click: () => { mainWindow.webContents.send('auto-batch-process'); }
            },
            {
              label: 'Create Droplet...',
              click: () => { mainWindow.webContents.send('auto-create-droplet'); }
            }
          ]
        },
        {
          label: 'Scripts & Extensions',
          submenu: [
            {
              label: 'Run Script...',
              click: () => { mainWindow.webContents.send('auto-run-script'); }
            },
            {
              label: 'Manage Plugins...',
              click: () => { mainWindow.webContents.send('auto-manage-plugins'); }
            },
            {
              label: 'Event Hooks...',
              click: () => { mainWindow.webContents.send('auto-event-hooks'); }
            }
          ]
        },
        {
          label: 'Templates',
          submenu: [
            {
              label: 'New from Template...',
              accelerator: 'CmdOrCtrl+Alt+N',
              click: () => { mainWindow.webContents.send('auto-new-from-template'); }
            },
            {
              label: 'Save as Template...',
              click: () => { mainWindow.webContents.send('auto-save-template'); }
            },
            {
              label: 'Asset Library...',
              click: () => { mainWindow.webContents.send('auto-asset-library'); }
            }
          ]
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About ARTemis',
          click: () => { mainWindow.webContents.send('help-about'); }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle save dialog
ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

// Handle open dialog
ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// Handle file save
ipcMain.handle('save-file', async (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handle file read
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handle binary file save (for image export)
ipcMain.handle('save-binary-file', async (event, filePath, base64Data) => {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handle load brush texture
ipcMain.on('load-brush-texture', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Load Brush Texture',
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }
    ],
    properties: ['openFile']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const imageData = fs.readFileSync(result.filePaths[0]).toString('base64');
    const ext = path.extname(result.filePaths[0]).substring(1);
    mainWindow.webContents.send('brush-texture-loaded', `data:image/${ext};base64,${imageData}`);
  }
});

// Handle import brushes
ipcMain.on('import-brushes', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Brush Presets',
    filters: [
      { name: 'JSON', extensions: ['json'] }
    ],
    properties: ['openFile']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const fileData = fs.readFileSync(result.filePaths[0], 'utf8');
    mainWindow.webContents.send('brushes-imported', fileData);
  }
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
