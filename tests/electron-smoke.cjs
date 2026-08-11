const { app, BrowserWindow, ipcMain, net, protocol } = require("electron");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const JSZip = require("jszip");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { createCatalogue } = require("../electron/catalogue.cjs");
const { resolveLibraryFileRequest } = require("../electron/protocol.cjs");

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

async function pdfFixture(filePath) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  for (let number = 1; number <= 3; number += 1) {
    const page = pdf.addPage([612, 792]);
    page.drawText(`Meditations - Book ${number}`, {
      x: 72,
      y: 700,
      size: 22,
      font,
      color: rgb(0.2, 0.15, 0.1),
    });
    page.drawText("The happiness of your life depends upon the quality of your thoughts.", {
      x: 72,
      y: 660,
      size: 13,
      font,
    });
  }
  fs.writeFileSync(filePath, await pdf.save());
}

async function epubFixture(filePath) {
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file(
    "META-INF/container.xml",
    '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
  );
  zip.file(
    "OEBPS/content.opf",
    '<?xml version="1.0" encoding="UTF-8"?><package version="3.0" unique-identifier="id" xmlns="http://www.idpf.org/2007/opf"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">mouseion-smoke</dc:identifier><dc:title>The Odyssey</dc:title><dc:creator>Homer</dc:creator><dc:language>en</dc:language><meta property="dcterms:modified">2026-08-11T00:00:00Z</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="chapter"/></spine></package>',
  );
  zip.file(
    "OEBPS/nav.xhtml",
    '<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol><li><a href="chapter.xhtml">Book I</a></li></ol></nav></body></html>',
  );
  zip.file(
    "OEBPS/chapter.xhtml",
    '<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Book I</title></head><body><h1>Book I</h1><p>Tell me, Muse, of the man of many ways.</p></body></html>',
  );
  fs.writeFileSync(
    filePath,
    await zip.generateAsync({
      type: "nodebuffer",
      mimeType: "application/epub+zip",
      compression: "DEFLATE",
    }),
  );
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForEvaluation(window, expression, predicate, description, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let value;
  while (Date.now() < deadline) {
    value = await window.webContents.executeJavaScript(expression);
    if (predicate(value)) return value;
    await wait(100);
  }
  throw new Error(`${description} timed out: ${JSON.stringify(value)}`);
}

async function capture(window, outputPath) {
  if (!outputPath) return;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const image = await window.webContents.capturePage();
  fs.writeFileSync(outputPath, image.toPNG());
}

async function captureDemoStep(window, fileName) {
  if (!process.env.MOUSEION_DEMO_DIR) return;
  // Let React state, book-cover entrances, and reader transitions settle so the
  // generated portfolio demo represents the finished UI rather than mid-motion frames.
  await wait(1000);
  await capture(window, path.join(process.env.MOUSEION_DEMO_DIR, fileName));
}

app
  .whenReady()
  .then(async () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "mouseion-electron-"));
    const pdf = path.join(temporary, "Meditations.pdf");
    const epub = path.join(temporary, "The Odyssey.epub");
    await Promise.all([pdfFixture(pdf), epubFixture(epub)]);

    const catalogue = createCatalogue(path.join(temporary, "library.json"));
    await catalogue.addPaths([pdf, epub]);

    protocol.handle("alexandria-file", (request) => {
      const filePath = resolveLibraryFileRequest(
        request.url,
        catalogue.read().map((item) => item.path),
      );
      if (!filePath) return new Response("Not found", { status: 404 });
      return net.fetch(pathToFileURL(filePath).toString());
    });
    ipcMain.handle("library:list", () => catalogue.list());
    ipcMain.handle("library:reading", (_event, id, progress, location) =>
      catalogue.updateReading(id, progress, location),
    );
    ipcMain.handle("library:favorite", (_event, id) => catalogue.toggleFavorite(id));
    ipcMain.handle("library:remove", (_event, id) => catalogue.remove(id));
    ipcMain.handle("library:choose", () => catalogue.list());
    ipcMain.handle("library:add-paths", () => catalogue.list());

    const window = new BrowserWindow({
      show: false,
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, "..", "electron", "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
      },
    });
    await window.loadFile(path.join(__dirname, "..", "desktop-dist", "index.html"));

    const cards = await waitForEvaluation(
      window,
      'document.querySelectorAll(".book-card").length',
      (count) => count === 2,
      "Library rendering",
    );
    await capture(window, process.env.MOUSEION_LIBRARY_SCREENSHOT);
    await captureDemoStep(window, "01-library.png");

    await window.webContents.executeJavaScript(
      'Array.from(document.querySelectorAll(".book-card")).find((card) => card.textContent.includes("The Odyssey")).querySelector(".favourite").click()',
    );
    await waitForEvaluation(
      window,
      'Array.from(document.querySelectorAll(".book-card")).find((card) => card.textContent.includes("The Odyssey"))?.querySelector(".favourite")?.classList.contains("saved")',
      Boolean,
      "Favourite toggle",
    );
    await captureDemoStep(window, "02-favourite.png");

    await window.webContents.executeJavaScript(`(() => {
      const input = document.querySelector('.search input');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'Meditations');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await waitForEvaluation(
      window,
      '({cards:document.querySelectorAll(".book-card").length,text:document.querySelector(".book-card")?.textContent||""})',
      (state) => state.cards === 1 && state.text.includes("Meditations"),
      "Library search",
    );
    await captureDemoStep(window, "03-search.png");
    await window.webContents.executeJavaScript(`(() => {
      const input = document.querySelector('.search input');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await waitForEvaluation(
      window,
      'document.querySelectorAll(".book-card").length',
      (count) => count === 2,
      "Search reset",
    );

    await window.webContents.executeJavaScript(
      'Array.from(document.querySelectorAll(".book-card")).find((card) => card.textContent.includes("The Odyssey")).click()',
    );
    const epubState = await waitForEvaluation(
      window,
      '({frame:!!document.querySelector(".epub-viewer iframe"),iframes:document.querySelectorAll("iframe").length,toc:document.querySelectorAll(".reader aside button").length,error:document.querySelector(".reader-error")?.textContent||"",viewer:document.querySelector(".epub-viewer")?.innerHTML.slice(0,500)||""})',
      (state) => state.error || (state.frame && state.toc >= 1),
      "EPUB rendering",
    );
    if (!epubState.frame || epubState.toc < 1 || epubState.error) {
      throw new Error(`EPUB reader failed: ${JSON.stringify(epubState)}`);
    }
    await captureDemoStep(window, "04-epub-reader.png");

    await window.webContents.executeJavaScript('document.querySelector(".reader-top button").click()');
    await waitForEvaluation(
      window,
      'document.querySelectorAll(".book-card").length',
      (count) => count === 2,
      "Return to library",
    );
    await window.webContents.executeJavaScript(
      'Array.from(document.querySelectorAll(".book-card")).find((card) => card.textContent.includes("Meditations")).click()',
    );
    const firstPage = await waitForEvaluation(
      window,
      '({canvas:document.querySelector(".pdf-page-stage canvas")?.width||0,error:document.querySelector(".reader-error")?.textContent||"",page:document.querySelector(".pdf-tools-group input")?.value,toolbar:!!document.querySelector(".pdf-toolbar")})',
      (state) => state.error || (state.toolbar && state.canvas >= 100 && state.page === "1"),
      "First PDF page rendering",
    );
    if (!firstPage.toolbar || firstPage.canvas < 100 || firstPage.error || firstPage.page !== "1") {
      throw new Error(`PDF reader failed: ${JSON.stringify(firstPage)}`);
    }
    let consecutiveClearChecks = 0;
    await waitForEvaluation(
      window,
      'Boolean(document.querySelector(".pdf-page-loading"))',
      (rendering) => {
        consecutiveClearChecks = rendering ? 0 : consecutiveClearChecks + 1;
        return consecutiveClearChecks >= 5;
      },
      "PDF loading indicator",
    );
    const loadingIndicator = await window.webContents.executeJavaScript(
      'Boolean(document.querySelector(".pdf-page-loading"))',
    );
    if (loadingIndicator) throw new Error("PDF loading indicator did not clear after rendering");
    await capture(window, process.env.MOUSEION_READER_SCREENSHOT);
    await captureDemoStep(window, "05-pdf-reader.png");

    await window.webContents.executeJavaScript(
      'document.querySelector(".pdf-tools-group:first-child button:last-child").click()',
    );
    const secondPage = await waitForEvaluation(
      window,
      '({page:document.querySelector(".pdf-tools-group input").value,canvas:document.querySelector(".pdf-page-stage canvas").width})',
      (state) => state.page === "2" && state.canvas >= 100,
      "Second PDF page rendering",
    );
    if (secondPage.page !== "2" || secondPage.canvas < 100) {
      throw new Error(`Page traversal failed: ${JSON.stringify(secondPage)}`);
    }
    consecutiveClearChecks = 0;
    await waitForEvaluation(
      window,
      'Boolean(document.querySelector(".pdf-page-loading"))',
      (rendering) => {
        consecutiveClearChecks = rendering ? 0 : consecutiveClearChecks + 1;
        return consecutiveClearChecks >= 5;
      },
      "Second PDF page loading indicator",
    );
    await captureDemoStep(window, "06-pdf-page-two.png");

    console.log("Electron smoke test passed: library load, EPUB render, PDF render, and page traversal");
    window.destroy();
    fs.rmSync(temporary, { recursive: true, force: true });
    app.quit();
  })
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });
