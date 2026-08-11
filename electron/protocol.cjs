const fs = require("node:fs");
const path = require("node:path");

function canonicalPath(filePath) {
  const resolved = path.resolve(filePath);
  try {
    return fs.realpathSync.native(resolved);
  } catch {
    return resolved;
  }
}

function pathKey(filePath) {
  const value = canonicalPath(filePath);
  return process.platform === "win32" ? value.toLowerCase() : value;
}

function resolveLibraryFileRequest(requestUrl, libraryPaths) {
  try {
    const url = new URL(requestUrl);
    if (
      url.protocol !== "alexandria-file:" ||
      url.hostname !== "local" ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    const requestedPath = canonicalPath(decodeURIComponent(url.pathname.slice(1)));
    const extension = path.extname(requestedPath).toLowerCase();
    if (!new Set([".pdf", ".epub"]).has(extension)) return null;

    const allowed = new Set(
      libraryPaths.filter((item) => typeof item === "string").map(pathKey),
    );
    return allowed.has(pathKey(requestedPath)) ? requestedPath : null;
  } catch {
    return null;
  }
}

module.exports = { resolveLibraryFileRequest };
