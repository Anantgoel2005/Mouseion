"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

type Props={url:string;title:string;initialProgress:number;onProgress:(progress:number)=>void};
type FitMode="page"|"width"|"custom";

export default function PdfReader({url,title,initialProgress,onProgress}:Props){
  const canvasRef=useRef<HTMLCanvasElement>(null);const viewportRef=useRef<HTMLDivElement>(null);const documentRef=useRef<any>(null);const onProgressRef=useRef(onProgress);const wheelTotal=useRef(0);const wheelTimer=useRef<number|undefined>(undefined);const wheelLock=useRef(false);const touchStart=useRef<{x:number;y:number}|null>(null);
  const [page,setPage]=useState(1);const [pageDraft,setPageDraft]=useState("1");const [pages,setPages]=useState(0);const [zoom,setZoom]=useState(1);const [fit,setFit]=useState<FitMode>("page");const [busy,setBusy]=useState(true);const [rendering,setRendering]=useState(false);const [error,setError]=useState("");const [direction,setDirection]=useState<"next"|"prev">("next");const [layoutTick,setLayoutTick]=useState(0);

  const goToPage=useCallback((target:number)=>{if(!pages)return;const next=Math.max(1,Math.min(pages,Math.round(target)));if(next===page){setPageDraft(String(next));return}setDirection(next>page?"next":"prev");setPage(next);setPageDraft(String(next))},[page,pages]);

  useEffect(()=>{onProgressRef.current=onProgress},[onProgress]);

  useEffect(()=>{let cancelled=false;let task:any;setBusy(true);setError("");setPages(0);documentRef.current=null;
    import("pdfjs-dist").then(async pdfjs=>{pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;task=pdfjs.getDocument({url});try{const pdf=await task.promise;if(cancelled){pdf.destroy();return}documentRef.current=pdf;const restored=Math.max(1,Math.min(pdf.numPages,Math.round((initialProgress/100)*pdf.numPages)||1));setPages(pdf.numPages);setPage(restored);setPageDraft(String(restored))}catch(error:any){if(!cancelled)setError(error?.name==="PasswordException"?"This PDF is password protected. Remove its password before importing it.":"This PDF could not be opened. It may be damaged or unsupported.")}finally{if(!cancelled)setBusy(false)}});
    return()=>{cancelled=true;task?.destroy();documentRef.current?.destroy();documentRef.current=null};
  },[url,initialProgress]);

  useEffect(()=>{const onResize=()=>setLayoutTick(v=>v+1);window.addEventListener("resize",onResize);return()=>window.removeEventListener("resize",onResize)},[]);

  useEffect(()=>{const pdf=documentRef.current;const canvas=canvasRef.current;const holder=viewportRef.current;if(!pdf||!canvas||!holder)return;let cancelled=false;let renderTask:any;setRendering(true);setError("");holder.scrollTo({top:0,left:0});
    pdf.getPage(page).then((pdfPage:any)=>{if(cancelled)return;const natural=pdfPage.getViewport({scale:1});const widthScale=Math.max(.25,(holder.clientWidth-72)/natural.width);const heightScale=Math.max(.25,(holder.clientHeight-64)/natural.height);const scale=fit==="page"?Math.min(widthScale,heightScale):fit==="width"?widthScale:zoom;const viewport=pdfPage.getViewport({scale});const ratio=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.floor(viewport.width*ratio);canvas.height=Math.floor(viewport.height*ratio);canvas.style.width=`${viewport.width}px`;canvas.style.height=`${viewport.height}px`;const context=canvas.getContext("2d",{alpha:false});if(!context)return;context.setTransform(ratio,0,0,ratio,0,0);context.fillStyle="#fff";context.fillRect(0,0,viewport.width,viewport.height);renderTask=pdfPage.render({canvasContext:context,viewport});return renderTask.promise}).then(()=>{if(!cancelled)setRendering(false)}).catch((reason:any)=>{if(!cancelled&&reason?.name!=="RenderingCancelledException"){setRendering(false);setError("This page could not be rendered.")}});
    onProgressRef.current(Math.round((page/pages)*100));return()=>{cancelled=true;renderTask?.cancel();setRendering(false)};
  },[page,pages,zoom,fit,layoutTick]);

  useEffect(()=>{const onKey=(event:KeyboardEvent)=>{const target=event.target as HTMLElement;if(target.matches("input, textarea, select, [contenteditable=true]"))return;if(event.key==="ArrowRight"||event.key==="PageDown"||event.key===" "){event.preventDefault();goToPage(page+1)}else if(event.key==="ArrowLeft"||event.key==="PageUp"){event.preventDefault();goToPage(page-1)}else if(event.key==="Home"){event.preventDefault();goToPage(1)}else if(event.key==="End"){event.preventDefault();goToPage(pages)}};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[goToPage,page,pages]);

  const changeZoom=(delta:number)=>{setFit("custom");setZoom(v=>Math.max(.4,Math.min(3,Number((v+delta).toFixed(2)))))};
  const commitPage=()=>goToPage(Number(pageDraft)||page);
  const onWheel=(event:React.WheelEvent)=>{const holder=viewportRef.current;if(!holder)return;if(event.ctrlKey||event.metaKey){event.preventDefault();changeZoom(event.deltaY>0?-.1:.1);return}const atTop=holder.scrollTop<=2;const atBottom=holder.scrollTop+holder.clientHeight>=holder.scrollHeight-2;const pageFits=holder.scrollHeight<=holder.clientHeight+3;const boundary=event.deltaY>0?(atBottom||pageFits):(atTop||pageFits);if(!boundary||wheelLock.current){wheelTotal.current=0;return}wheelTotal.current+=event.deltaY;window.clearTimeout(wheelTimer.current);wheelTimer.current=window.setTimeout(()=>{wheelTotal.current=0},240);if(Math.abs(wheelTotal.current)>=95){event.preventDefault();wheelLock.current=true;goToPage(page+(wheelTotal.current>0?1:-1));wheelTotal.current=0;window.setTimeout(()=>{wheelLock.current=false},380)}};

  return <div className="pdf-reader-shell">
    <div className="pdf-toolbar"><div className="pdf-tools-group"><button onClick={()=>goToPage(page-1)} disabled={page<=1} aria-label="Previous page">‹</button><span><input value={pageDraft} onChange={e=>setPageDraft(e.target.value.replace(/\D/g,""))} onBlur={commitPage} onKeyDown={e=>{if(e.key==="Enter"){commitPage();e.currentTarget.blur()}if(e.key==="Escape"){setPageDraft(String(page));e.currentTarget.blur()}}} aria-label="Page number"/> / {pages||"—"}</span><button onClick={()=>goToPage(page+1)} disabled={page>=pages} aria-label="Next page">›</button></div><div className="pdf-title">{title}</div><div className="pdf-tools-group"><button onClick={()=>changeZoom(-.15)} aria-label="Zoom out">−</button><span>{fit==="custom"?`${Math.round(zoom*100)}%`:fit.toUpperCase()}</span><button onClick={()=>changeZoom(.15)} aria-label="Zoom in">＋</button><button className={fit==="width"?"active":""} onClick={()=>setFit("width")}>FIT WIDTH</button><button className={fit==="page"?"active":""} onClick={()=>setFit("page")}>FIT PAGE</button></div></div>
    <div className="pdf-canvas-viewport" ref={viewportRef} onWheel={onWheel} onTouchStart={e=>{const t=e.touches[0];touchStart.current={x:t.clientX,y:t.clientY}}} onTouchEnd={e=>{const start=touchStart.current;const t=e.changedTouches[0];if(start&&Math.abs(t.clientX-start.x)>70&&Math.abs(t.clientX-start.x)>Math.abs(t.clientY-start.y))goToPage(page+(t.clientX<start.x?1:-1));touchStart.current=null}}>{busy&&<div className="pdf-status"><i/>Preparing the manuscript…</div>}{rendering&&!busy&&<div className="pdf-page-loading">Rendering page {page}…</div>}{error&&<div className="reader-error">{error}</div>}{!error&&<div key={page} className={`pdf-page-stage turn-${direction}`}><canvas ref={canvasRef} aria-label={`Page ${page} of ${title}`}/></div>}</div>
  </div>;
}
