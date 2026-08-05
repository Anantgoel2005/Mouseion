const {app,BrowserWindow,dialog,ipcMain,protocol,net}=require("electron");
const path=require("node:path");
const {pathToFileURL}=require("node:url");
const {createCatalogue}=require("./catalogue.cjs");

protocol.registerSchemesAsPrivileged([{scheme:"alexandria-file",privileges:{secure:true,standard:true,supportFetchAPI:true,stream:true,corsEnabled:true}}]);
function createWindow(){const win=new BrowserWindow({width:1440,height:920,minWidth:900,minHeight:650,show:true,backgroundColor:"#f2ead8",title:"The Alexandrian",autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,"preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});win.webContents.setWindowOpenHandler(()=>({action:"deny"}));win.loadFile(path.join(__dirname,"..","desktop-dist","index.html"))}

if(!app.requestSingleInstanceLock()){app.quit()}else{
  app.whenReady().then(()=>{const catalogue=createCatalogue(path.join(app.getPath("userData"),"library.json"));
    protocol.handle("alexandria-file",request=>{const url=new URL(request.url);return net.fetch(pathToFileURL(decodeURIComponent(url.pathname.slice(1))).toString())});
    ipcMain.handle("library:list",()=>catalogue.list());
    ipcMain.handle("library:choose",async()=>{const result=await dialog.showOpenDialog({title:"Add books to The Alexandrian",properties:["openFile","multiSelections"],filters:[{name:"PDF and EPUB books",extensions:["pdf","epub"]}]});return result.canceled?catalogue.list():catalogue.addPaths(result.filePaths)});
    ipcMain.handle("library:add-paths",(_e,paths)=>catalogue.addPaths(Array.isArray(paths)?paths:[]));
    ipcMain.handle("library:reading",(_e,id,progress,location)=>catalogue.updateReading(id,progress,location));
    ipcMain.handle("library:favorite",(_e,id)=>catalogue.toggleFavorite(id));
    ipcMain.handle("library:remove",(_e,id)=>catalogue.remove(id));
    createWindow();app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});
  });
  app.on("second-instance",()=>{const win=BrowserWindow.getAllWindows()[0];if(win){if(win.isMinimized())win.restore();win.focus()}});
}
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit()});
