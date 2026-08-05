"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Volume = {
  id: number;
  title: string;
  author: string;
  format: "EPUB" | "PDF";
  progress: number;
  color: string;
  glyph: string;
  pages: number;
  fileUrl?: string;
};

declare global {
  interface Window {
    alexandria?: {
      chooseBooks: () => Promise<Volume[]>;
      getLibrary: () => Promise<Volume[]>;
      updateProgress: (id: number, progress: number) => Promise<void>;
    };
  }
}

const seedVolumes: Volume[] = [
  { id: 1, title: "Meditations", author: "Marcus Aurelius", format: "EPUB", progress: 68, color: "terracotta", glyph: "M", pages: 254 },
  { id: 2, title: "The Histories", author: "Herodotus", format: "PDF", progress: 24, color: "lapis", glyph: "H", pages: 716 },
  { id: 3, title: "The Republic", author: "Plato", format: "EPUB", progress: 0, color: "olive", glyph: "Π", pages: 416 },
  { id: 4, title: "Metamorphoses", author: "Ovid", format: "PDF", progress: 91, color: "wine", glyph: "O", pages: 382 },
  { id: 5, title: "On the Nature of Things", author: "Lucretius", format: "EPUB", progress: 12, color: "sand", glyph: "L", pages: 302 },
  { id: 6, title: "The Iliad", author: "Homer", format: "EPUB", progress: 42, color: "bronze", glyph: "Ι", pages: 560 },
];

const chapters = ["Book I · Of the things in our control", "Book II · On tranquility", "Book III · The discipline of assent", "Book IV · Against appearances"];

export default function Home() {
  const [volumes, setVolumes] = useState(seedVolumes);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All works");
  const [active, setActive] = useState<Volume | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const epubRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.alexandria?.getLibrary().then((saved) => { if (saved.length) setVolumes(saved); });
  }, []);

  useEffect(() => {
    if (!active?.fileUrl || active.format !== "EPUB" || !epubRef.current) return;
    let rendition: any;
    let cancelled = false;
    import("epubjs").then(({ default: ePub }) => {
      if (cancelled || !epubRef.current) return;
      const book = ePub(active.fileUrl);
      rendition = book.renderTo(epubRef.current, { width: "100%", height: "100%", spread: "none" });
      rendition.display();
      rendition.themes.default({ body: { background: "#f9f4e8", color: "#352f27", "font-family": "Georgia, serif", "font-size": "112%", "line-height": "1.7", padding: "24px 8%" } });
    });
    return () => { cancelled = true; rendition?.destroy(); };
  }, [active]);

  const filtered = useMemo(() => volumes.filter((v) => {
    const matches = `${v.title} ${v.author}`.toLowerCase().includes(query.toLowerCase());
    return matches && (filter === "All works" || v.format === filter || (filter === "In progress" && v.progress > 0 && v.progress < 100));
  }), [volumes, query, filter]);

  function importFiles(files: FileList | File[]) {
    const allowed = Array.from(files).filter((file) => /\.(pdf|epub)$/i.test(file.name));
    if (!allowed.length) { setNotice("Only PDF and EPUB scrolls may enter the collection."); return; }
    const palette = ["terracotta", "lapis", "olive", "wine", "bronze"];
    const added = allowed.map((file, index): Volume => ({
      id: Date.now() + index,
      title: file.name.replace(/\.(pdf|epub)$/i, "").replace(/[-_]/g, " "),
      author: "Unknown scribe",
      format: file.name.toLowerCase().endsWith(".pdf") ? "PDF" : "EPUB",
      progress: 0,
      color: palette[(volumes.length + index) % palette.length],
      glyph: file.name.charAt(0).toUpperCase(),
      pages: Math.max(1, Math.round(file.size / 2800)),
      fileUrl: URL.createObjectURL(file),
    }));
    setVolumes((current) => [...added, ...current]);
    setShowImport(false);
    setNotice(`${added.length} ${added.length === 1 ? "volume" : "volumes"} added to the collection.`);
    window.setTimeout(() => setNotice(""), 3200);
  }

  async function chooseDesktopBooks() {
    if (!window.alexandria) { setShowImport(true); return; }
    const saved = await window.alexandria.chooseBooks();
    if (!saved.length) return;
    setVolumes(saved);
    setNotice("Your new volumes have been catalogued for offline reading.");
    window.setTimeout(() => setNotice(""), 3200);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="The Alexandrian Library home">
          <span className="brand-mark"><i /><b>Α</b><i /></span>
          <span><small>THE</small>ALEXANDRIAN<em>PRIVATE LIBRARY</em></span>
        </a>

        <nav aria-label="Library navigation">
          <p>COLLECTION</p>
          <button className="nav-active"><span>▦</span> The Library <b>{volumes.length}</b></button>
          <button><span>◔</span> Reading now <b>{volumes.filter(v => v.progress > 0 && v.progress < 100).length}</b></button>
          <button><span>◇</span> Favourites</button>
          <button><span>⌁</span> Annotations</button>
          <p>CATALOGUE</p>
          <button><span>Α</span> Authors</button>
          <button><span>⌘</span> Subjects</button>
          <button><span>≡</span> Collections</button>
        </nav>

        <div className="quote">
          <span>❧</span>
          <p>“The library is the temple of learning.”</p>
          <small>— CICERO</small>
        </div>
        <button className="settings">⚙ <span>Library settings</span></button>
      </aside>

      <section className="content" id="top">
        <header>
          <label className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the collection…" /><kbd>⌘ K</kbd></label>
          <div className="header-actions"><button className="icon-button" aria-label="Notifications">♢<i /></button><div className="avatar">AN</div></div>
        </header>

        <div className="hero">
          <div className="hero-copy">
            <p className="eyebrow"><span /> YOUR PRIVATE COLLECTION <span /></p>
            <h1>The Great Library</h1>
            <p className="subtitle">A sanctuary for the written word</p>
            <div className="stats">
              <div><b>{volumes.length}</b><span>VOLUMES</span></div><i />
              <div><b>{volumes.reduce((n, v) => n + v.pages, 0).toLocaleString()}</b><span>PAGES</span></div><i />
              <div><b>{volumes.filter(v => v.progress > 0 && v.progress < 100).length}</b><span>IN PROGRESS</span></div>
            </div>
          </div>
          <div className="temple" aria-hidden="true">
            <div className="sun-disc" /><div className="pediment"><span>KNOWLEDGE ENDURES</span></div>
            <div className="columns">{[1,2,3,4,5].map(n => <i key={n} />)}</div><div className="steps" />
          </div>
        </div>

        <div className="toolbar">
          <div className="filters">
            {["All works", "In progress", "EPUB", "PDF"].map(item => <button key={item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{item}</button>)}
          </div>
          <div className="tools"><button className={view === "grid" ? "chosen" : ""} onClick={() => setView("grid")} aria-label="Grid view">▦</button><button className={view === "list" ? "chosen" : ""} onClick={() => setView("list")} aria-label="List view">☷</button><button className="import-button" onClick={chooseDesktopBooks}>＋ <span>ADD A VOLUME</span></button></div>
        </div>

        <div className={`library ${view}`}>
          {filtered.map((book, index) => (
            <article className="book-card" key={book.id} style={{"--delay": `${index * 65}ms`} as React.CSSProperties} onClick={() => setActive(book)}>
              <div className={`cover ${book.color}`}>
                <div className="cover-frame"><span className="corner tl">⌜</span><span className="corner tr">⌝</span><b>{book.glyph}</b><small>{book.title}</small><i>❦</i></div>
                <div className="spine" />
                <span className="format">{book.format}</span>
              </div>
              <div className="book-info">
                <h2>{book.title}</h2><p>{book.author}</p>
                <div className="progress-row"><div><i style={{width: `${book.progress}%`}} /></div><span>{book.progress ? `${book.progress}%` : "Unread"}</span></div>
              </div>
            </article>
          ))}
          {!filtered.length && <div className="empty"><b>Nothing found in the stacks</b><p>Try another title, author, or catalogue filter.</p></div>}
        </div>

        <footer><span>☙</span><p>THE MOUSEION OF ALEXANDRIA · EST. MMXXVI</p><span>❧</span></footer>
      </section>

      {showImport && <div className="modal-backdrop" onMouseDown={() => setShowImport(false)}>
        <section className="import-modal" onMouseDown={e => e.stopPropagation()}>
          <button className="close" onClick={() => setShowImport(false)}>×</button>
          <p className="eyebrow"><span /> NEW ACQUISITION <span /></p><h2>Enter a volume</h2><p>Place a PDF or EPUB into the care of the Library.</p>
          <div className="drop-zone" onDragOver={e => e.preventDefault()} onDrop={e => {e.preventDefault(); importFiles(e.dataTransfer.files)}} onClick={() => fileRef.current?.click()}>
            <div className="scroll-icon">↟</div><b>Drop your manuscripts here</b><span>or choose them from your device</span><button>CHOOSE FILES</button>
            <input ref={fileRef} type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" multiple onChange={e => e.target.files && importFiles(e.target.files)} />
          </div><small>Accepted formats · PDF · EPUB</small>
        </section>
      </div>}

      {active && <div className="reader">
        <div className="reader-top"><button onClick={() => setActive(null)}>← <span>Return to the Library</span></button><div><b>{active.title}</b><span>{active.author}</span></div><button aria-label="Reader settings">Aa</button></div>
        <aside><p>CONTENTS</p>{chapters.map((c, i) => <button key={c} className={i === 0 ? "current" : ""}><span>{String(i + 1).padStart(2,"0")}</span>{c}</button>)}</aside>
        <article className="reading-page">
          {active.fileUrl && active.format === "PDF" ? <iframe src={active.fileUrl} title={active.title} /> : active.fileUrl && active.format === "EPUB" ? <div ref={epubRef} className="epub-viewer" /> : <div className="page-paper"><p className="book-number">BOOK I</p><h1>{active.title}</h1><div className="ornament">— ❦ —</div><p className="dropcap">The things in our control are opinion, pursuit, desire, aversion, and, in a word, whatever are our own actions. The things not in our control are body, property, reputation, command, and whatever are not our own actions.</p><p>Remember, then, that if you suppose the things which are by nature slavish to be free, and the things which are in the power of others to be your own, you will be hindered; you will lament; you will be disturbed.</p><blockquote>“It is not things themselves that trouble us, but our opinions of things.”</blockquote><p>Seek not that the things which happen should happen as you wish; but wish the things which happen to be as they are, and you will have a tranquil flow of life.</p></div>}
        </article>
        <div className="reader-bottom"><button>‹</button><div><i style={{width: `${active.progress || 8}%`}} /></div><span>{active.progress || 8}%</span><button>›</button></div>
      </div>}

      {notice && <div className="toast">✓ {notice}</div>}
    </main>
  );
}
