const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

let win;
let configPath;
function validateUrl(input) {
  try {
    const url = new URL(input);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    if (url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch { return null; }
}
function readSavedServer() {
  try { return validateUrl(JSON.parse(fs.readFileSync(configPath, 'utf8')).serverUrl); }
  catch { return null; }
}
function getServerUrl() {
  return validateUrl(process.env.GAPNET_WEB_URL) || readSavedServer() ||
    (!app.isPackaged ? 'http://127.0.0.1:5173' : null);
}
async function loadContent() {
  if (!win) return;
  const server = getServerUrl();
  if (!server) { await win.loadFile(path.join(__dirname, 'connect.html')); return; }
  try {
    await win.loadURL(server);
  } catch {
    await win.loadFile(path.join(__dirname, 'connect.html'));
    if (win) win.webContents.send('gapnet:connection-error', server);
  }
}
app.whenReady().then(async () => {
  configPath = path.join(app.getPath('userData'), 'connection.json');
  ipcMain.handle('gapnet:get-server', () => getServerUrl() || '');
  ipcMain.handle('gapnet:save-server', async (_event, value) => {
    const server = validateUrl(value);
    if (!server) throw new Error('آدرس سرور معتبر نیست (http یا https).');
    fs.writeFileSync(configPath, JSON.stringify({ serverUrl: server }, null, 2), { mode: 0o600 });
    await loadContent();
    return server;
  });
  ipcMain.handle('gapnet:retry', () => loadContent());
  win = new BrowserWindow({
    width: 1440, height: 880, minWidth: 940, minHeight: 610,
    title: 'GapNet | گپ‌نت', icon: path.join(__dirname, 'assets/icon.png'),
    backgroundColor: '#f8fafa', show: false, autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#ffffff', symbolColor: '#102235', height: 75 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false, contextIsolation: true, sandbox: true,
      webSecurity: true,
    },
  });
  win.once('ready-to-show', () => win?.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, target) => {
    const activeServer = getServerUrl();
    if (activeServer && new URL(target).origin !== activeServer) event.preventDefault();
  });
  await loadContent();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) app.relaunch(); });
