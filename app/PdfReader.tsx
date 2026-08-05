"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

type Props={url:string;title:string;initialProgress:number;onProgress:(progress:number)=>void};

export default function PdfReader({url,title,initialProgress,onProgress}:Props){
  const canvasRef=useRef<HTMLCanvasElement>(null);const viewportRef=useRef<HTMLDivElement>(null);const documentRef=useRef<any>(null);const wheelLock=useRef(false);const touchStart=useRef<{x:number;y:number}|null>(null);
  const [page,setPage]=useState(1);const [pages,setPages]=useState(0);const [zoom,setZoom]=useState(1);const [fit,setFit]=useState(true);const [busy,setBusy]=useState(true);const [rendering,setRendering]=useState(false);const [error,setError]=useState("");const [direction,setDirection]=useState<"next"|"prev">("next");

  const goToPage=useCallback((target:number)=>{if(!pages)return;const next=Math.max(1,Math.min(pages,target));if(next===page)return;setDirection(next>page?"next":"prev");setPage(next);viewportRef.current?.scrollTo({top:0,left:0,behavior:"smooth"})},[page,pages]);

  useEffect(()=>{let cancelled=false;let task:any;setBusy(true);setError("");
    import("pdfjs-dist").then(async pdfjs=>{pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;task=pdfjs.getDocument({url});try{const pdf=await task.promise;if(cancelled){pdf.destroy();return}documentRef.current=pdf;setPages(pdf.numPages);setPage(Math.max(1,Math.min(pdf.numPages,Math.round((initialProgress/100)*pdf.numPages)||1)));}catch{if(!cancelled)setError("This PDF could not be opened. It may be damaged or password protected.")}finally{if(!cancelled)setBusy(false)}});
    return()=>{cancelled=true;task?.destroy();documentRef.current?.destroy();documentRef.current=null};
  },[url,initialProgress]);

  useEffect(()=>{const pdf=documentRef.current;const canvas=canvasRef.current;const holder=viewportRef.current;if(!pdf||!canvas||!holder)return;let cancelled=false;let renderTask:any;
    setRendering(true);pdf.getPage(page).then((pdfPage:any)=>{if(cancelled)return;const natural=pdfPage.getViewport({scale:1});const scale=fit?Math.max(.35,(holder.clientWidth-72)/natural.width):zoom;const viewport=pdfPage.getViewport({scale});const ratio=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.floor(viewport.width*ratio);canvas.height=Math.floor(viewport.height*ratio);canvas.style.width=`${viewport.width}px`;canvas.style.height=`${viewport.height}px`;const context=canvas.getContext("2d");if(!context)return;context.setTransform(ratio,0,0,ratio,0,0);renderTask=pdfPage.render({canvasContext:context,viewport});return renderTask.promise}).then(()=>{if(!cancelled)setRendering(false)}).catch((reason:any)=>{if(!cancelled&&reason?.name!=="RenderingCancelledException")setError("This page could not be rendered.")});
    if(pages)onProgress(Math.round((page/pages)*100));return()=>{cancelled=true;renderTask?.cancel()};
  },[page,pages,zoom,fit,onProgress]);

  useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if(event.key==="ArrowRight"||event.key==="PageDown"||event.key===" "){event.preventDefault();goToPage(page+1)}if(event.key==="ArrowLeft"||event.key==="PageUp"){event.preventDefault();goToPage(page-1)}if(event.key==="Home")goToPage(1);if(event.key==="End")goToPage(pages)};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[goToPage,page,pages]);

  const changeZoom=(delta:number)=>{setFit(false);setZoom(v=>Math.max(.5,Math.min(2.5,Number((v+delta).toFixed(2)))))};
  const onWheel=(event:React.WheelEvent)=>{const holder=viewportRef.current;if(!holder||wheelLock.current||Math.abs(event.deltaY)<18)return;const atTop=holder.scrollTop<=2;const atBottom=holder.scrollTop+holder.clientHeight>=holder.scrollHeight-2;const pageFits=holder.scrollHeight<=holder.clientHeight+3;if((event.deltaY>0&&(atBottom||pageFits))||(event.deltaY<0&&(atTop||pageFits))){event.preventDefault();wheelLock.current=true;goToPage(page+(event.deltaY>0?1:-1));window.setTimeout(()=>{wheelLock.current=false},450)}};
  return <div className="pdf-reader-shell">
    <div className="pdf-toolbar"><div className="pdf-tools-group"><button onClick={()=>goToPage(page-1)} disabled={page<=1} aria-label="Previous page">‹</button><span><input value={page} onChange={e=>goToPage(Number(e.target.value)||1)} aria-label="Page number"/> / {pages||"—"}</span><button onClick={()=>goToPage(page+1)} disabled={page>=pages} aria-label="Next page">›</button></div><div className="pdf-title">{title}</div><div className="pdf-tools-group"><button onClick={()=>changeZoom(-.15)} aria-label="Zoom out">−</button><span>{fit?"FIT":`${Math.round(zoom*100)}%`}</span><button onClick={()=>changeZoom(.15)} aria-label="Zoom in">＋</button><button className={fit?"active":""} onClick={()=>setFit(true)}>FIT PAGE</button></div></div>
    <div className="pdf-canvas-viewport" ref={viewportRef} onWheel={onWheel} onTouchStart={e=>{const t=e.touches[0];touchStart.current={x:t.clientX,y:t.clientY}}} onTouchEnd={e=>{const start=touchStart.current;const t=e.changedTouches[0];if(start&&Math.abs(t.clientX-start.x)>70&&Math.abs(t.clientX-start.x)>Math.abs(t.clientY-start.y))goToPage(page+(t.clientX<start.x?1:-1));touchStart.current=null}}>{busy&&<div className="pdf-status"><i/>Preparing the manuscript…</div>}{rendering&&!busy&&<div className="pdf-page-loading">Rendering page {page}…</div>}{error&&<div className="reader-error">{error}</div>}<div key={`${page}-${fit}-${zoom}`} className={`pdf-page-stage turn-${direction}`}><canvas ref={canvasRef} aria-label={`Page ${page} of ${title}`}/></div></div>
  </div>;
}
