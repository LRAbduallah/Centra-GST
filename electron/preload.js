const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  
  saveFile: async (suggestedName, contentBase64) => {
    // 1. Show save dialog
    const dialogResult = await ipcRenderer.invoke('save-file-dialog', {
      defaultPath: suggestedName
    });
    
    if (dialogResult.canceled || !dialogResult.filePath) {
      return { success: false, canceled: true };
    }
    
    // 2. Write file
    const writeResult = await ipcRenderer.invoke('write-file', {
      filePath: dialogResult.filePath,
      contentBase64
    });
    
    return {
      success: writeResult.success,
      filePath: dialogResult.filePath,
      error: writeResult.error
    };
  },
  
  printApp: async () => {
    return await ipcRenderer.invoke('print-pdf');
  },
  
  db: {
    getProfiles: async () => ipcRenderer.invoke('db-get-profiles'),
    upsertProfile: async (id, data) => ipcRenderer.invoke('db-upsert-profile', { id, data }),
    deleteProfile: async (id) => ipcRenderer.invoke('db-delete-profile', { id }),
    getCatalog: async (profileId) => ipcRenderer.invoke('db-get-catalog', { profileId }),
    upsertCatalogItem: async (id, profileId, data) => ipcRenderer.invoke('db-upsert-catalog-item', { id, profileId, data }),
    deleteCatalogItem: async (id) => ipcRenderer.invoke('db-delete-catalog-item', { id }),
    getInvoices: async (profileId) => ipcRenderer.invoke('db-get-invoices', { profileId }),
    upsertInvoice: async (id, profileId, data) => ipcRenderer.invoke('db-upsert-invoice', { id, profileId, data }),
    deleteInvoice: async (id) => ipcRenderer.invoke('db-delete-invoice', { id }),
    getSetting: async (key) => ipcRenderer.invoke('db-get-setting', { key }),
    setSetting: async (key, value) => ipcRenderer.invoke('db-set-setting', { key, value }),
    isReady: async () => ipcRenderer.invoke('db-is-ready'),
    selectCreate: async () => ipcRenderer.invoke('db-select-create'),
    selectOpen: async () => ipcRenderer.invoke('db-select-open')
  }
});
