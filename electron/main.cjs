const { app, BrowserWindow, dialog, ipcMain, protocol, net } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");
protocol.registerSchemesAsPrivileged([{ scheme: "alexandria-file", privileges: { secure: true, standard: true, supportFetchAPI: true, stream: true } }]);
const palette = ["terracotta", "lapis", "olive", "wine", "bronze", "sand"];
const cataloguePath = () => path.join(app.getPath("userData"), "library.json");
const readLibrary = () => { try { return JSON.parse(fs.readFileSync(cataloguePath(), "utf8")); } catch { return []; } };
const saveLibrary = (items) => fs.writeFileSync(cataloguePath(), JSON.stringify(items, null, 2));
const toRenderer = (item) => ({ ...item, fileUrl: `alexandria-file://local/${encodeURIComponent(item.path)}` });
function createWindow() {
  const win = new BrowserWindow({ width: 1440, height: 920, minWidth: 900, minHeight: 650, backgroundColor: "#f2ead8", title: "The Alexandrian", webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, webSecurity: true } });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, "..", "desktop-dist", "index.html"));
}
app.whenReady().then(() => {
  protocol.handle("alexandria-file", (request) => { const url = new URL(request.url); return net.fetch(pathToFileURL(decodeURIComponent(url.pathname.slice(1))).toString()); });
  ipcMain.handle("library:list", () => readLibrary().filter(v => fs.existsSync(v.path)).map(toRenderer));
  ipcMain.handle("library:choose", async () => {
    const result = await dialog.showOpenDialog({ title: "Add volumes to The Alexandrian", properties: ["openFile", "multiSelections"], filters: [{ name: "Books", extensions: ["pdf", "epub"] }] });
    if (result.canceled) return [];
    const current = readLibrary();
    for (const filePath of result.filePaths) {
      if (current.some(v => v.path.toLowerCase() === filePath.toLowerCase())) continue;
      const stat = fs.statSync(filePath); const ext = path.extname(filePath).toLowerCase(); const title = path.basename(filePath, ext).replace(/[-_]/g, " ");
      current.unshift({ id: Date.now() + current.length, title, author: "Unknown scribe", format: ext === ".pdf" ? "PDF" : "EPUB", progress: 0, color: palette[current.length % palette.length], glyph: title.charAt(0).toUpperCase(), pages: Math.max(1, Math.round(stat.size / 2800)), path: filePath });
    }
    saveLibrary(current); return current.map(toRenderer);
  });
  ipcMain.handle("library:progress", (_event, id, progress) => { const items = readLibrary(); const item = items.find(v => v.id === id); if (item) item.progress = progress; saveLibrary(items); });
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
