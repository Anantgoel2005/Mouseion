const { contextBridge, ipcRenderer, webUtils } = require("electron");
contextBridge.exposeInMainWorld("alexandria", {
  chooseBooks: () => ipcRenderer.invoke("library:choose"),
  importDropped: (files) => ipcRenderer.invoke("library:add-paths", files.map(file => webUtils.getPathForFile(file)).filter(Boolean)),
  getLibrary: () => ipcRenderer.invoke("library:list"),
  updateReading: (id, progress, location) => ipcRenderer.invoke("library:reading", id, progress, location),
  toggleFavorite: (id) => ipcRenderer.invoke("library:favorite", id),
  removeBook: (id) => ipcRenderer.invoke("library:remove", id),
});
