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
  }
});
