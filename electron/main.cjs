const { app, BrowserWindow, dialog, ipcMain, protocol, net } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");
const JSZip = require("jszip");

protocol.registerSchemesAsPrivileged([{ scheme:"alexandria-file", privileges:{ secure:true, standard:true, supportFetchAPI:true, stream:true } }]);
const palette=["terracotta","lapis","olive","wine","bronze","sand"];
const cataloguePath=()=>path.join(app.getPath("userData"),"library.json");
const readLibrary=()=>{try{const data=JSON.parse(fs.readFileSync(cataloguePath(),"utf8"));return Array.isArray(data)?data:[]}catch{return[]}};
const saveLibrary=items=>{fs.mkdirSync(path.dirname(cataloguePath()),{recursive:true});fs.writeFileSync(cataloguePath(),JSON.stringify(items,null,2))};
const toRenderer=item=>({...item,fileUrl:`alexandria-file://local/${encodeURIComponent(item.path)}`});
const visibleLibrary=()=>readLibrary().filter(v=>fs.existsSync(v.path)).map(toRenderer);
const cleanText=value=>value?.replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();

async function epubMetadata(filePath){
  try{const zip=await JSZip.loadAsync(fs.readFileSync(filePath));const opfName=Object.keys(zip.files).find(n=>n.toLowerCase().endsWith(".opf"));if(!opfName)return{};const opf=await zip.file(opfName).async("string");const title=cleanText(opf.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i)?.[1]);const author=cleanText(opf.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i)?.[1]);return{title,author}}catch{return{}}
}
async function addPaths(paths){
  const current=readLibrary(); let changed=false;
  for(const filePath of paths){
    if(typeof filePath!=="string"||!fs.existsSync(filePath)||current.some(v=>v.path.toLowerCase()===filePath.toLowerCase()))continue;
    const ext=path.extname(filePath).toLowerCase();if(![".pdf",".epub"].includes(ext))continue;
    const stat=fs.statSync(filePath);const fallback=path.basename(filePath,ext).replace(/[-_]+/g," ").replace(/\s+/g," ").trim();const metadata=ext===".epub"?await epubMetadata(filePath):{};const title=metadata.title||fallback;
    current.unshift({id:Date.now()+current.length,title,author:metadata.author||"",format:ext===".pdf"?"PDF":"EPUB",progress:0,color:palette[current.length%palette.length],glyph:(title.match(/[A-Za-z0-9Α-Ω]/)?.[0]||"A").toUpperCase(),size:stat.size,path:filePath,favorite:false,location:""});changed=true;
  }
  if(changed)saveLibrary(current);return current.filter(v=>fs.existsSync(v.path)).map(toRenderer);
}

function createWindow(){
  const win=new BrowserWindow({width:1440,height:920,minWidth:900,minHeight:650,show:true,backgroundColor:"#f2ead8",title:"The Alexandrian",autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,"preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  win.webContents.setWindowOpenHandler(()=>({action:"deny"}));
  win.loadFile(path.join(__dirname,"..","desktop-dist","index.html"));
}

if(!app.requestSingleInstanceLock()){app.quit()}else{
  app.whenReady().then(()=>{
    protocol.handle("alexandria-file",request=>{const url=new URL(request.url);return net.fetch(pathToFileURL(decodeURIComponent(url.pathname.slice(1))).toString())});
    ipcMain.handle("library:list",()=>visibleLibrary());
    ipcMain.handle("library:choose",async()=>{const result=await dialog.showOpenDialog({title:"Add books to The Alexandrian",properties:["openFile","multiSelections"],filters:[{name:"PDF and EPUB books",extensions:["pdf","epub"]}]});return result.canceled?visibleLibrary():addPaths(result.filePaths)});
    ipcMain.handle("library:add-paths",(_e,paths)=>addPaths(paths));
    ipcMain.handle("library:reading",(_e,id,progress,location)=>{const items=readLibrary();const item=items.find(v=>v.id===id);if(item){item.progress=Math.round(progress);if(location)item.location=location;saveLibrary(items)}});
    ipcMain.handle("library:favorite",(_e,id)=>{const items=readLibrary();const item=items.find(v=>v.id===id);if(item){item.favorite=!item.favorite;saveLibrary(items)}return visibleLibrary()});
    ipcMain.handle("library:remove",(_e,id)=>{const items=readLibrary().filter(v=>v.id!==id);saveLibrary(items);return visibleLibrary()});
    createWindow();app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});
  });
  app.on("second-instance",()=>{const win=BrowserWindow.getAllWindows()[0];if(win){if(win.isMinimized())win.restore();win.focus()}});
}
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit()});
