const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#1e1e1e',
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
