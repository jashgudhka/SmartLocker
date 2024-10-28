const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Function to create the Electron window
function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load the HTML file into the Electron window
  win.loadFile('index.html');

  // Open DevTools for debugging
  // win.webContents.openDevTools();
}

// Electron app ready event to create the window
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
