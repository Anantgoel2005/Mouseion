const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const JSZip=require("jszip");
const {createCatalogue,normalizeVolume}=require("../electron/catalogue.cjs");

test("normalizes legacy records without placeholder authors",()=>{const item=normalizeVolume({id:1,path:"C:\\books\\my_book.pdf",author:"Unknown scribe",progress:150},0);assert.equal(item.title,"my book");assert.equal(item.author,"");assert.equal(item.progress,100);assert.equal(item.format,"PDF")});

test("catalogue imports, deduplicates, persists, and removes local books",async t=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),"alexandrian-test-"));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const catalogueFile=path.join(dir,"library.json");const pdf=path.join(dir,"A Real Document.pdf");fs.writeFileSync(pdf,"%PDF-1.4\n%%EOF");
  const zip=new JSZip();zip.file("META-INF/container.xml",'<container><rootfiles><rootfile full-path="OPS/book.opf"/></rootfiles></container>');zip.file("OPS/book.opf",'<package xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:title>The &amp; Tested Book</dc:title><dc:creator>Ada Author</dc:creator></metadata></package>');const epub=path.join(dir,"book.epub");fs.writeFileSync(epub,await zip.generateAsync({type:"nodebuffer"}));
  const catalogue=createCatalogue(catalogueFile);let items=await catalogue.addPaths([pdf,epub,pdf,path.join(dir,"ignored.txt")]);assert.equal(items.length,2);assert.equal(items.find(x=>x.format==="EPUB").title,"The & Tested Book");assert.equal(items.find(x=>x.format==="EPUB").author,"Ada Author");
  const pdfItem=items.find(x=>x.format==="PDF");catalogue.updateReading(pdfItem.id,42);items=catalogue.toggleFavorite(pdfItem.id);assert.equal(items.find(x=>x.id===pdfItem.id).progress,42);assert.equal(items.find(x=>x.id===pdfItem.id).favorite,true);assert.equal(createCatalogue(catalogueFile).list().length,2);
  items=catalogue.remove(pdfItem.id);assert.equal(items.length,1);assert.equal(fs.existsSync(pdf),true)
});

test("missing files disappear from the visible library without corrupting the catalogue",async t=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),"alexandrian-missing-"));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,"temporary.pdf");fs.writeFileSync(file,"%PDF");const catalogue=createCatalogue(path.join(dir,"library.json"));await catalogue.addPaths([file]);fs.unlinkSync(file);assert.equal(catalogue.list().length,0);assert.equal(catalogue.read().length,1)});
