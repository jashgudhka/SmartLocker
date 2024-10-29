const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios');
const keytar = require('keytar');

const INACTIVITY_LIMIT = 10 * 60 * 1e3;
let mainWindow, loginWindow, inactivityTimeout;
let apiBaseUrl = 'http://localhost:3000';

function resetInactivityTimeout() {
  clearTimeout(inactivityTimeout);
  inactivityTimeout = setTimeout(() => {
      mainWindow.webContents.send('user-inactive');
  }, INACTIVITY_LIMIT);
}

function createLoginWindow() {
  loginWindow = new BrowserWindow({
    width: 1200,
    height: 850,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  loginWindow.loadFile('login.html');
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 850,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });
  mainWindow.webContents.on('before-input-event', resetInactivityTimeout);
  resetInactivityTimeout();
  mainWindow.loadFile('app.html');
}


ipcMain.handle('signup', async (event, credentials) => {
  try {
    const response = await axios.post(`${apiBaseUrl}/signup`, credentials);
    alert("Sign up Successfull!")
    return response.data;
  } catch (error) {
    alert('Signup failed:', error);
    return { error: 'Signup failed' };
  }
});

ipcMain.handle('login', async (event, credentials) => {
  try {
    console.log(credentials)
    const response = await axios.post(`${apiBaseUrl}/login`, credentials);
    
    const token = response.data.accessToken;
    console.log(response.data)
    console.log(token)
    await keytar.setPassword('ElectronApp', 'auth-token', token);
    alert("Login Successfull!")
    loginWindow.close();
    createMainWindow();
    return { success: true };
  } catch (error) {
    console.error('Login failed:', error);
    return { error: 'Login failed' };
  }
});

ipcMain.handle('logout', async () => {
  await keytar.deletePassword('ElectronApp', 'auth-token');
  return { success: true };
});

ipcMain.handle('isAuthorized', async () => {
  const token = await keytar.getPassword('ElectronApp', 'auth-token');
  if (token) {
    if (loginWindow) loginWindow.close();
    createMainWindow();
  }
  return !!token;
});

app.whenReady().then(() => {
  createLoginWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createLoginWindow();
    }
  });
});

// app.on('web-contents-created', (event, contents) => {
//   contents.on('devtools-opened', () => {
//     if (app.isPackaged) {
//       contents.closeDevTools();
//     }
//   });
// });

// // Quit when all windows are closed, except on macOS
// app.on('window-all-closed', () => {
//   if (process.platform !== 'darwin') {
//     app.quit();
//   }
// });
