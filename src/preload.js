const { contextBridge, ipcRenderer } = require('electron');
const { pathToFileURL } = require('node:url');

contextBridge.exposeInMainWorld('electronAPI', {
  openMediaFile: () => ipcRenderer.invoke('dialog:openMediaFile'),
  openSubtitleFile: () => ipcRenderer.invoke('dialog:openSubtitleFile'),
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    put: (key, value) => ipcRenderer.invoke('settings:put', key, value)
  },
  pathToFileURL: (filePath) => pathToFileURL(filePath).href
});
