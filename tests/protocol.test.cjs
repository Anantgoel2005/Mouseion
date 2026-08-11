const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { resolveLibraryFileRequest } = require("../electron/protocol.cjs");

test("the book protocol serves only catalogued PDF and EPUB files", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mouseion-protocol-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const allowedPdf = path.join(directory, "Allowed book.pdf");
  const unlistedPdf = path.join(directory, "Private notes.pdf");
  const unlistedText = path.join(directory, "secret.txt");
  fs.writeFileSync(allowedPdf, "%PDF");
  fs.writeFileSync(unlistedPdf, "%PDF");
  fs.writeFileSync(unlistedText, "private");

  const urlFor = (filePath) => `alexandria-file://local/${encodeURIComponent(filePath)}`;

  assert.equal(
    resolveLibraryFileRequest(urlFor(allowedPdf), [allowedPdf]),
    fs.realpathSync.native(allowedPdf),
  );
  assert.equal(resolveLibraryFileRequest(urlFor(unlistedPdf), [allowedPdf]), null);
  assert.equal(resolveLibraryFileRequest(urlFor(unlistedText), [unlistedText]), null);
  assert.equal(resolveLibraryFileRequest(urlFor(allowedPdf), []), null);
  assert.equal(resolveLibraryFileRequest("alexandria-file://other/book.pdf", [allowedPdf]), null);
  assert.equal(resolveLibraryFileRequest("not a valid URL", [allowedPdf]), null);
});
