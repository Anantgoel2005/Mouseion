const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("alexandria", {
  chooseBooks: () => ipcRenderer.invoke("library:choose"),
  getLibrary: () => ipcRenderer.invoke("library:list"),
  updateProgress: (id, progress) => ipcRenderer.invoke("library:progress", id, progress),
});
