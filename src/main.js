const { app, BrowserWindow, dialog, ipcMain, protocol } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { randomUUID } = require('crypto');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app-media',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

const storePromise = import('electron-store')
  .then(({ default: Store }) => new Store({
    defaults: {
      seekStep: 5,
      showProgressBar: true
    }
  }))
  .catch(error => {
    console.error('Failed to load electron-store:', error);
    throw error;
  });

const mediaAccessTokens = new Map();

function registerMediaProtocol () {
  protocol.registerFileProtocol(
    'app-media',
    (request, callback) => {
      try {
        const url = new URL(request.url);
        const token = url.hostname;
        const filePath = mediaAccessTokens.get(token);

        if (!filePath) {
          callback({ error: -6 });
          return;
        }

        callback(filePath);
      } catch (error) {
        console.error('Failed to resolve media resource:', error);
        callback({ error: -2 });
      }
    },
    error => {
      if (error) {
        console.error('Failed to register app-media protocol:', error);
      }
    }
  );
}

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
  const token = randomUUID();
  mediaAccessTokens.set(token, filePath);

  return {
    path: filePath,
    name: path.basename(filePath),
    extension: path.extname(filePath).toLowerCase(),
    token,
    url: `app-media://${token}`
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

ipcMain.handle('settings:get', async (_event, key) => {
  const store = await storePromise;
  return store.get(key);
});

ipcMain.handle('settings:put', async (_event, key, value) => {
  const store = await storePromise;
  store.set(key, value);
  return store.get(key);
});

ipcMain.handle('media:release', (_event, token) => {
  if (typeof token !== 'string' || token.length === 0) {
    return false;
  }

  const didDelete = mediaAccessTokens.delete(token);
  return didDelete;
});

app.whenReady().then(() => {
  registerMediaProtocol();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  mediaAccessTokens.clear();
  if (process.platform !== 'darwin') app.quit();
});
