const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const Store = require('electron-store');

const store = new Store({
  defaults: {
    seekStep: 5,
    showProgressBar: true
  }
});

function createWindow () {
  const win = new BrowserWindow({
    width: 1024,
    height: 720,
    title: '媒体播放器',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

ipcMain.handle('dialog:openMediaFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      {
        name: '媒体文件',
        extensions: [
          'mp4', 'mkv', 'mov', 'webm', 'mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'
        ]
      },
      { name: '所有文件', extensions: ['*'] }
    ]
  });

  if (canceled || !filePaths.length) {
    return null;
  }

  const filePath = filePaths[0];
  return {
    path: filePath,
    name: path.basename(filePath),
    extension: path.extname(filePath).toLowerCase()
  };
});

ipcMain.handle('dialog:openSubtitleFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: '字幕文件', extensions: ['vtt', 'srt'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  });

  if (canceled || !filePaths.length) {
    return null;
  }

  const filePath = filePaths[0];
  const content = await fs.readFile(filePath, 'utf-8');

  return {
    path: filePath,
    name: path.basename(filePath),
    extension: path.extname(filePath).toLowerCase(),
    content
  };
});

ipcMain.handle('settings:get', (_event, key) => {
  return store.get(key);
});

ipcMain.handle('settings:put', (_event, key, value) => {
  store.set(key, value);
  return store.get(key);
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
