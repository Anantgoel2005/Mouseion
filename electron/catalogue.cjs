const fs=require("node:fs");
const path=require("node:path");
const JSZip=require("jszip");

const palette=["terracotta","lapis","olive","wine","bronze","sand"];
const cleanText=value=>value?.replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();
const normalizeVolume=(item,index=0)=>{if(!item||typeof item.path!=="string")return null;const ext=path.extname(item.path).toLowerCase();if(![".pdf",".epub"].includes(ext))return null;let size=Number(item.size)||0;try{if(!size)size=fs.statSync(item.path).size}catch{}const title=String(item.title||path.basename(item.path,ext).replace(/[-_]+/g," ")).trim()||"Untitled";return{id:Number.isFinite(Number(item.id))?Number(item.id):Date.now()+index,title,author:item.author&&item.author!=="Unknown scribe"?String(item.author):"",format:ext===".pdf"?"PDF":"EPUB",progress:Math.max(0,Math.min(100,Number(item.progress)||0)),color:palette.includes(item.color)?item.color:palette[index%palette.length],glyph:String(item.glyph||title.match(/[A-Za-z0-9Α-Ω]/)?.[0]||"A").slice(0,1).toUpperCase(),size,path:item.path,favorite:Boolean(item.favorite),location:typeof item.location==="string"?item.location:""}};

async function epubMetadata(filePath){try{const zip=await JSZip.loadAsync(fs.readFileSync(filePath));const opfName=Object.keys(zip.files).find(n=>n.toLowerCase().endsWith(".opf"));if(!opfName)return{};const opf=await zip.file(opfName).async("string");return{title:cleanText(opf.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i)?.[1]),author:cleanText(opf.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i)?.[1])}}catch{return{}}}

function createCatalogue(filePath){
  const read=()=>{try{const data=JSON.parse(fs.readFileSync(filePath,"utf8"));return(Array.isArray(data)?data:[]).map(normalizeVolume).filter(Boolean)}catch{return[]}};
  const save=items=>{fs.mkdirSync(path.dirname(filePath),{recursive:true});const temporary=`${filePath}.tmp`;fs.writeFileSync(temporary,JSON.stringify(items.map(normalizeVolume).filter(Boolean),null,2));try{fs.renameSync(temporary,filePath)}catch{fs.copyFileSync(temporary,filePath);fs.unlinkSync(temporary)}};
  const render=item=>({...item,fileUrl:`alexandria-file://local/${encodeURIComponent(item.path)}`});
  const list=()=>read().filter(v=>fs.existsSync(v.path)).map(render);
  const addPaths=async paths=>{const current=read();let changed=false;let nextId=current.reduce((max,item)=>Math.max(max,Number(item.id)||0),0)+1;for(const file of paths){if(typeof file!=="string"||!fs.existsSync(file)||current.some(v=>v.path.toLowerCase()===file.toLowerCase()))continue;const ext=path.extname(file).toLowerCase();if(![".pdf",".epub"].includes(ext)||!fs.statSync(file).isFile())continue;const stat=fs.statSync(file);const fallback=path.basename(file,ext).replace(/[-_]+/g," ").replace(/\s+/g," ").trim();const metadata=ext===".epub"?await epubMetadata(file):{};const title=metadata.title||fallback;current.unshift(normalizeVolume({id:nextId++,title,author:metadata.author||"",progress:0,color:palette[current.length%palette.length],glyph:title.match(/[A-Za-z0-9Α-Ω]/)?.[0]||"A",size:stat.size,path:file,favorite:false,location:""},current.length));changed=true}if(changed)save(current);return list()};
  const updateReading=(id,progress,location)=>{const items=read();const item=items.find(v=>v.id===id);if(item){item.progress=Math.max(0,Math.min(100,Math.round(Number(progress)||0)));if(typeof location==="string")item.location=location;save(items)}};
  const toggleFavorite=id=>{const items=read();const item=items.find(v=>v.id===id);if(item){item.favorite=!item.favorite;save(items)}return list()};
  const remove=id=>{const items=read().filter(v=>v.id!==id);save(items);return list()};
  return{list,addPaths,updateReading,toggleFavorite,remove,read};
}

module.exports={createCatalogue,normalizeVolume,epubMetadata};
