const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('gapnetDesktop', {
  isDesktop: true,
  getServerUrl: () => ipcRenderer.invoke('gapnet:get-server'),
  saveServerUrl: (url) => ipcRenderer.invoke('gapnet:save-server', url),
  retry: () => ipcRenderer.invoke('gapnet:retry'),
  onConnectionError: (callback) => ipcRenderer.on('gapnet:connection-error', (_event, url) => callback(url)),
});
