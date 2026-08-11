const { app, BrowserWindow, dialog, ipcMain, net, protocol } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { createCatalogue } = require("./catalogue.cjs");
const { resolveLibraryFileRequest } = require("./protocol.cjs");

const mouseionData = path.join(app.getPath("appData"), "Mouseion");
const libraryFile = path.join(mouseionData, "library.json");

if (!fs.existsSync(libraryFile)) {
  for (const legacyName of ["The Alexandrian", "the-alexandrian-reader"]) {
    const legacyFile = path.join(app.getPath("appData"), legacyName, "library.json");
    if (fs.existsSync(legacyFile)) {
      fs.mkdirSync(mouseionData, { recursive: true });
      fs.copyFileSync(legacyFile, libraryFile);
      break;
    }
  }
}

app.setPath("userData", mouseionData);

protocol.registerSchemesAsPrivileged([
  {
    scheme: "alexandria-file",
    privileges: {
      corsEnabled: true,
      secure: true,
      standard: true,
      stream: true,
      supportFetchAPI: true,
    },
  },
]);

let mainWindow;

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 650,
    show: true,
    backgroundColor: "#f2ead8",
    title: "Mouseion",
    icon: path.join(__dirname, "..", "desktop-dist", "icon.png"),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.loadFile(path.join(__dirname, "..", "desktop-dist", "index.html"));
  mainWindow = window;
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = undefined;
  });
  return window;
}

function fromMainFrame(handler) {
  return (event, ...args) => {
    if (!mainWindow || event.senderFrame !== mainWindow.webContents.mainFrame) {
      throw new Error("Rejected IPC request from an untrusted frame");
    }
    return handler(...args);
  };
}

function registerIpcHandlers(catalogue) {
  ipcMain.handle("library:list", fromMainFrame(() => catalogue.list()));
  ipcMain.handle(
    "library:choose",
    fromMainFrame(async () => {
      const result = await dialog.showOpenDialog({
        title: "Add books to Mouseion",
        properties: ["openFile", "multiSelections"],
        filters: [{ name: "PDF and EPUB books", extensions: ["pdf", "epub"] }],
      });
      return result.canceled ? catalogue.list() : catalogue.addPaths(result.filePaths);
    }),
  );
  ipcMain.handle(
    "library:add-paths",
    fromMainFrame((paths) => catalogue.addPaths(Array.isArray(paths) ? paths : [])),
  );
  ipcMain.handle(
    "library:reading",
    fromMainFrame((id, progress, location) => catalogue.updateReading(id, progress, location)),
  );
  ipcMain.handle("library:favorite", fromMainFrame((id) => catalogue.toggleFavorite(id)));
  ipcMain.handle("library:remove", fromMainFrame((id) => catalogue.remove(id)));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(() => {
    const catalogue = createCatalogue(libraryFile);

    protocol.handle("alexandria-file", (request) => {
      const filePath = resolveLibraryFileRequest(
        request.url,
        catalogue.read().map((item) => item.path),
      );
      if (!filePath) return new Response("Not found", { status: 404 });
      return net.fetch(pathToFileURL(filePath).toString());
    });

    registerIpcHandlers(catalogue);
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("second-instance", () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
