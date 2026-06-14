const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./database');

// Allow E2E tests to override the userData path for isolation
if (process.env.ELECTRON_USER_DATA) {
  app.setPath('userData', process.env.ELECTRON_USER_DATA);
}

const isTest = process.env.NODE_ENV === 'test';
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

  // Load app: test mode loads built dist; dev mode loads Vite dev server; production loads dist
  const isDev = !app.isPackaged && !isTest;
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

// IPC Handlers for SQLite Database
ipcMain.handle('db-get-profiles', async () => {
  return db.getProfiles();
});
ipcMain.handle('db-upsert-profile', async (event, { id, data }) => {
  return db.upsertProfile(id, data);
});
ipcMain.handle('db-delete-profile', async (event, { id }) => {
  return db.deleteProfile(id);
});
ipcMain.handle('db-get-catalog', async (event, { profileId }) => {
  return db.getCatalog(profileId);
});
ipcMain.handle('db-upsert-catalog-item', async (event, { id, profileId, data }) => {
  return db.upsertCatalogItem(id, profileId, data);
});
ipcMain.handle('db-delete-catalog-item', async (event, { id }) => {
  return db.deleteCatalogItem(id);
});
ipcMain.handle('db-get-invoices', async (event, { profileId }) => {
  return db.getInvoices(profileId);
});
ipcMain.handle('db-upsert-invoice', async (event, { id, profileId, data }) => {
  return db.upsertInvoice(id, profileId, data);
});
ipcMain.handle('db-delete-invoice', async (event, { id }) => {
  return db.deleteInvoice(id);
});
ipcMain.handle('db-get-setting', async (event, { key }) => {
  return db.getSetting(key);
});
ipcMain.handle('db-set-setting', async (event, { key, value }) => {
  return db.setSetting(key, value);
});

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');
let dbInitialized = false;

function getSavedConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading config:', err);
  }
  return {};
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error('Error saving config:', err);
  }
}

ipcMain.handle('db-is-ready', async () => {
  return dbInitialized;
});

ipcMain.handle('db-select-create', async () => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Create New Database File',
      defaultPath: path.join(app.getPath('documents'), 'invoiceforge.db'),
      buttonLabel: 'Create Database',
      filters: [
        { name: 'SQLite Database (*.db)', extensions: ['db'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    db.initDatabase(result.filePath);
    dbInitialized = true;

    const config = getSavedConfig();
    config.databasePath = result.filePath;
    saveConfig(config);

    return { success: true, filePath: result.filePath };
  } catch (err) {
    console.error('Error creating database:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db-select-open', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open Existing Database File',
      buttonLabel: 'Open Database',
      properties: ['openFile'],
      filters: [
        { name: 'SQLite Database (*.db, *.sqlite)', extensions: ['db', 'sqlite'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    const filePath = result.filePaths[0];
    db.initDatabase(filePath);
    dbInitialized = true;

    const config = getSavedConfig();
    config.databasePath = filePath;
    saveConfig(config);

    return { success: true, filePath };
  } catch (err) {
    console.error('Error opening database:', err);
    return { success: false, error: err.message };
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
  if (isTest) {
    const DB_PATH = path.join(app.getPath('userData'), 'invoiceforge.db');
    db.initDatabase(DB_PATH);
    dbInitialized = true;
  } else {
    const config = getSavedConfig();
    if (config.databasePath && fs.existsSync(config.databasePath)) {
      try {
        db.initDatabase(config.databasePath);
        dbInitialized = true;
      } catch (err) {
        console.error('Failed to initialize database from config:', err);
      }
    }
  }

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
