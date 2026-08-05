"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PdfReader from "./PdfReader";

type Volume = { id:number; title:string; author?:string; format:"EPUB"|"PDF"; progress:number; color:string; glyph:string; size:number; fileUrl:string; favorite?:boolean; location?:string };
type TocItem = { label:string; href:string };

declare global { interface Window { alexandria?: {
  chooseBooks:()=>Promise<Volume[]>; importDropped:(files:File[])=>Promise<Volume[]>; getLibrary:()=>Promise<Volume[]>;
  updateReading:(id:number,progress:number,location?:string)=>Promise<void>; toggleFavorite:(id:number)=>Promise<Volume[]>; removeBook:(id:number)=>Promise<Volume[]>;
} } }

export default function Home() {
  const [volumes,setVolumes]=useState<Volume[]>([]); const [loaded,setLoaded]=useState(false); const [query,setQuery]=useState("");
  const [filter,setFilter]=useState("All works"); const [section,setSection]=useState("Library"); const [active,setActive]=useState<Volume|null>(null);
  const [view,setView]=useState<"grid"|"list">("grid"); const [notice,setNotice]=useState(""); const [toc,setToc]=useState<TocItem[]>([]);const [confirmRemove,setConfirmRemove]=useState(false);
  const [readerProgress,setReaderProgress]=useState(0); const [readerError,setReaderError]=useState(""); const epubRef=useRef<HTMLDivElement>(null); const renditionRef=useRef<any>(null);

  useEffect(()=>{ window.alexandria?.getLibrary().then(v=>{setVolumes(v);setLoaded(true)}).catch(()=>setLoaded(true)); },[]);
  useEffect(()=>{
    if(!active||active.format!=="EPUB"||!active.fileUrl||!epubRef.current)return;
    let cancelled=false; let book:any;
    setToc([]); setReaderError(""); setReaderProgress(active.progress||0);
    import("epubjs").then(async({default:ePub})=>{
      if(cancelled||!epubRef.current)return;
      try{
        book=ePub(active.fileUrl); const navigation=await book.loaded.navigation; if(cancelled)return;
        const flatten=(items:any[]):TocItem[]=>items.flatMap((x:any)=>[{label:String(x.label||"Untitled section").trim(),href:x.href},...flatten(x.subitems||x.children||[])]);
        setToc(flatten(navigation.toc||[]));
        const rendition=book.renderTo(epubRef.current,{width:"100%",height:"100%",spread:"none"}); renditionRef.current=rendition;
        rendition.themes.default({body:{background:"#f9f4e8",color:"#352f27","font-family":"Georgia, serif","font-size":"112%","line-height":"1.75",padding:"22px 8%"},a:{color:"#8a5d2d"}});
        await book.ready;
        rendition.on("relocated",(location:any)=>{const calculated=book.locations?.length?.()?book.locations.percentageFromCfi(location.start.cfi):null;const p=calculated==null?readerProgress:Math.max(0,Math.min(100,Math.round(calculated*100)));setReaderProgress(p);setVolumes(items=>items.map(v=>v.id===active.id?{...v,progress:p,location:location.start.cfi}:v));window.alexandria?.updateReading(active.id,p,location.start.cfi)});
        await rendition.display(active.location||undefined);book.locations.generate(1400).catch(()=>undefined);
      }catch{setReaderError("This EPUB could not be opened. It may be damaged or protected by DRM.");}
    });
    return()=>{cancelled=true;renditionRef.current?.destroy();renditionRef.current=null;book?.destroy?.()};
  },[active]);

  useEffect(()=>{if(active?.format!=="EPUB")return;const onKey=(event:KeyboardEvent)=>{const target=event.target as HTMLElement;if(target.matches("input, textarea, select, [contenteditable=true]"))return;if(event.key==="ArrowRight"||event.key==="PageDown"||event.key===" "){event.preventDefault();renditionRef.current?.next()}else if(event.key==="ArrowLeft"||event.key==="PageUp"){event.preventDefault();renditionRef.current?.prev()}else if(event.key==="Escape")setActive(null)};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[active?.id,active?.format]);
  useEffect(()=>{setConfirmRemove(false);if(!active)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setActive(null)};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close)},[active?.id]);

  const filtered=useMemo(()=>volumes.filter(v=>{
    const text=`${v.title} ${v.author||""}`.toLowerCase().includes(query.toLowerCase());
    const sectionMatch=section==="Library"||(section==="Reading now"&&v.progress>0&&v.progress<100)||(section==="Favourites"&&v.favorite);
    const formatMatch=filter==="All works"||(filter==="In progress"&&v.progress>0&&v.progress<100)||v.format===filter;
    return text&&sectionMatch&&formatMatch;
  }),[volumes,query,filter,section]);

  const flash=(message:string)=>{setNotice(message);window.setTimeout(()=>setNotice(""),3000)};
  const savePdfProgress=useCallback((progress:number)=>{if(!active)return;setVolumes(items=>items.map(v=>v.id===active.id?{...v,progress}:v));window.alexandria?.updateReading(active.id,progress)},[active?.id]);
  const chooseBooks=async()=>{const next=await window.alexandria?.chooseBooks();if(next){setVolumes(next);if(next.length!==volumes.length)flash("The new volumes are ready for offline reading.")}};
  const dropped=async(files:File[])=>{const next=await window.alexandria?.importDropped(files);if(next){setVolumes(next);flash("The dropped volumes have been catalogued.")}};
  const toggleFavorite=async(e:React.MouseEvent,id:number)=>{e.stopPropagation();const next=await window.alexandria?.toggleFavorite(id);if(next)setVolumes(next)};
  const removeBook=async()=>{if(!active)return;const next=await window.alexandria?.removeBook(active.id);if(next){setVolumes(next);setActive(null);flash("The volume was removed from the catalogue. The original file was not deleted.")}};
  const openSection=(next:string)=>{setSection(next);setFilter("All works")};
  const totalSize=volumes.reduce((n,v)=>n+v.size,0); const readableSize=totalSize<1e9?`${(totalSize/1e6).toFixed(totalSize?1:0)} MB`:`${(totalSize/1e9).toFixed(1)} GB`;

  return <main className="app-shell" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();dropped(Array.from(e.dataTransfer.files))}}>
    <aside className="sidebar">
      <button className="brand" onClick={()=>openSection("Library")}><span className="brand-mark"><img src="./icon.png" alt=""/></span><span><small>THE</small>MOUSEION<em>PRIVATE LIBRARY</em></span></button>
      <nav aria-label="Library navigation"><p>COLLECTION</p>
        {[{name:"Library",icon:"▦",count:volumes.length},{name:"Reading now",icon:"◔",count:volumes.filter(v=>v.progress>0&&v.progress<100).length},{name:"Favourites",icon:"◇",count:volumes.filter(v=>v.favorite).length}].map(x=><button key={x.name} className={section===x.name?"nav-active":""} onClick={()=>openSection(x.name)}><span>{x.icon}</span>{x.name}<b>{x.count}</b></button>)}
      </nav>
      <div className="quote"><span>❧</span><p>“A library is not a luxury, but one of the necessities of life.”</p><small>— HENRY WARD BEECHER</small></div>
      <div className="offline-mark">● <span>OFFLINE · LOCAL FILES</span></div>
    </aside>
    <section className="content" id="top">
      <header><label className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by title or author…"/></label><div className="header-actions"><div className="offline-pill">● OFFLINE</div><div className="avatar"><img src="./icon.png" alt="Mouseion"/></div></div></header>
      <div className="hero"><div className="hero-copy"><p className="eyebrow"><span/> YOUR PRIVATE COLLECTION <span/></p><h1>{section==="Library"?"The Great Library":section}</h1><p className="subtitle">Your books, preserved on this device</p><div className="stats"><div><b>{volumes.length}</b><span>VOLUMES</span></div><i/><div><b>{readableSize}</b><span>ON DISK</span></div><i/><div><b>{volumes.filter(v=>v.progress>0&&v.progress<100).length}</b><span>IN PROGRESS</span></div></div></div><div className="temple" aria-hidden="true"><div className="sun-disc"/><div className="pediment"><span>KNOWLEDGE ENDURES</span></div><div className="columns">{[1,2,3,4,5].map(n=><i key={n}/>)}</div><div className="steps"/></div></div>
      <div className="toolbar"><div className="filters">{["All works","In progress","EPUB","PDF"].map(x=><button key={x} className={filter===x?"selected":""} onClick={()=>setFilter(x)}>{x}</button>)}</div><div className="tools"><button className={view==="grid"?"chosen":""} onClick={()=>setView("grid")} aria-label="Grid view">▦</button><button className={view==="list"?"chosen":""} onClick={()=>setView("list")} aria-label="List view">☷</button><button className="import-button" onClick={chooseBooks}>＋ <span>ADD BOOKS</span></button></div></div>
      <div className={`library ${view}`}>
        {filtered.map((book,index)=><article className="book-card" key={book.id} style={{"--delay":`${index*45}ms`} as React.CSSProperties} onClick={()=>setActive(book)}><div className={`cover ${book.color}`}><div className="cover-frame"><span className="corner tl">⌜</span><span className="corner tr">⌝</span><b>{book.glyph}</b><small>{book.title}</small><i>❦</i></div><div className="spine"/><span className="format">{book.format}</span><button className={`favourite ${book.favorite?"saved":""}`} onClick={e=>toggleFavorite(e,book.id)} aria-label={book.favorite?"Remove from favourites":"Add to favourites"}>{book.favorite?"◆":"◇"}</button></div><div className="book-info"><h2>{book.title}</h2>{book.author&&<p>{book.author}</p>}<div className="progress-row"><div><i style={{width:`${book.progress}%`}}/></div><span>{book.progress?`${book.progress}%`:"Unread"}</span></div></div></article>)}
        {loaded&&!filtered.length&&<div className="empty"><div className="empty-seal">Α</div><b>{volumes.length?"No volumes match this view":"Your library awaits"}</b><p>{volumes.length?"Try another search or catalogue filter.":"Add downloaded PDF and EPUB files. They remain on your computer and are available offline."}</p>{!volumes.length&&<button onClick={chooseBooks}>ADD YOUR FIRST BOOKS</button>}</div>}
      </div><footer><span>☙</span><p>MOUSEION · PRIVATE OFFLINE LIBRARY</p><span>❧</span></footer>
    </section>
    {active&&<div className="reader"><div className="reader-top"><button onClick={()=>setActive(null)}>← <span>Return to the Library</span></button><div><b>{active.title}</b>{active.author&&<span>{active.author}</span>}</div><button className={`remove-reader ${confirmRemove?"confirming":""}`} onClick={()=>confirmRemove?removeBook():setConfirmRemove(true)} onBlur={()=>setConfirmRemove(false)} title="Remove from library">{confirmRemove?"Confirm":"Remove"}</button></div>
      <aside><p>{active.format==="EPUB"?"CONTENTS":"DOCUMENT"}</p>{active.format==="EPUB"?(toc.length?toc.map((x,i)=><button key={`${x.href}-${i}`} onClick={()=>renditionRef.current?.display(x.href)}><span>{String(i+1).padStart(2,"0")}</span>{x.label}</button>):<div className="toc-loading">Preparing contents…</div>):<div className="pdf-note"><b>PDF READER</b><span>Scroll naturally. At a page boundary, keep scrolling to turn the page. Use Ctrl + wheel to zoom.</span></div>}</aside>
      <article className={`reading-page ${active.format==="PDF"?"pdf-reading-page":""}`}>{active.format==="PDF"?<PdfReader url={active.fileUrl} title={active.title} initialProgress={active.progress} onProgress={savePdfProgress}/>:readerError?<div className="reader-error">{readerError}</div>:<div ref={epubRef} className="epub-viewer"/>}</article>
      <div className="reader-bottom">{active.format==="EPUB"?<><button onClick={()=>renditionRef.current?.prev()}>‹</button><div><i style={{width:`${readerProgress}%`}}/></div><span>{readerProgress}%</span><button onClick={()=>renditionRef.current?.next()}>›</button></>:<span>PDF · Stored locally · Available offline</span>}</div>
    </div>}
    {notice&&<div className="toast">✓ {notice}</div>}
  </main>;
}
