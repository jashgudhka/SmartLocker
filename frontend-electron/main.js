const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
let inactivityTimeout;
const INACTIVITY_LIMIT = 1 * 60 * 1e3;
let mainWindow;

function resetInactivityTimeout() {
  clearTimeout(inactivityTimeout);
  inactivityTimeout = setTimeout(() => {
      mainWindow.webContents.send('user-inactive');
  }, INACTIVITY_LIMIT);
}

// Function to create the Electron window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.webContents.on('before-input-event', resetInactivityTimeout);

  resetInactivityTimeout();

  // Load the HTML file into the Electron window
  mainWindow.loadFile('index.html');

  // Open DevTools for debugging
  // mainWindow.webContents.openDevTools();
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
