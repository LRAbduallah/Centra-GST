const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// Track window dimensions state
const WINDOW_STATE_PATH = path.join(app.getPath('userData'), 'window-state.json');

function getSavedWindowState() {
  try {
    if (fs.existsSync(WINDOW_STATE_PATH)) {
      return JSON.parse(fs.readFileSync(WINDOW_STATE_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading window state:', err);
  }
  return { width: 1200, height: 800 };
}

function saveWindowState(state) {
  try {
    fs.writeFileSync(WINDOW_STATE_PATH, JSON.stringify(state));
  } catch (err) {
    console.error('Error saving window state:', err);
  }
}

function createWindow() {
  const state = getSavedWindowState();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1024,
    minHeight: 700,
    title: 'InvoiceForge',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0f0f0f',
  });

  // Load app (dev server or production build)
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in dev mode
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Save state on close/resize/move
  const saveState = () => {
    if (!mainWindow.isDestroyed()) {
      const bounds = mainWindow.getBounds();
      saveWindowState({
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y
      });
    }
  };

  mainWindow.on('resize', saveState);
  mainWindow.on('move', saveState);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('save-file-dialog', async (event, { defaultPath, title, buttonLabel }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultPath || 'invoice.pdf',
    title: title || 'Save Document',
    buttonLabel: buttonLabel || 'Save',
    filters: [
      { name: 'PDF Document', extensions: ['pdf'] },
      { name: 'Image (PNG)', extensions: ['png'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result;
});

ipcMain.handle('write-file', async (event, { filePath, contentBase64 }) => {
  try {
    const buffer = Buffer.from(contentBase64, 'base64');
    fs.writeFileSync(filePath, buffer);
    return { success: true };
  } catch (error) {
    console.error('Error writing file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('print-pdf', async (event) => {
  if (!mainWindow) return { success: false, error: 'No active window' };
  try {
    // Standard system printing window
    mainWindow.webContents.print({
      silent: false,
      printBackground: true,
      color: true,
    }, (success, failureReason) => {
      if (!success && failureReason !== 'user-canceled') {
        console.error('Print failure:', failureReason);
      }
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
