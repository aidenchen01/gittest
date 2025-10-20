const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 900,
    height: 640,
    title: 'Hello macOS App',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 加载我们自己的 UI
  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  // 在 macOS 上，通常用户显式 Cmd+Q 才退出
  if (process.platform !== 'darwin') app.quit();
});
