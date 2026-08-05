# Mouseion

Mouseion is a private, offline-first PDF and EPUB library for Windows, inspired by the ancient institution that housed the Library of Alexandria.

![Mouseion icon](build/icon.png)

## Features

- Local PDF and EPUB catalogue—books never leave your computer
- Custom themed PDF reader with page animations, zoom, fit modes, keyboard, wheel, and swipe navigation
- EPUB reader with metadata extraction, table of contents, and remembered reading position
- Search, format filters, favourites, reading progress, grid and list views
- Drag-and-drop importing and safe removal that never deletes the original book
- Automatic migration from earlier Alexandrian Reader releases

## Requirements

- Windows 10 or newer (64-bit)
- Node.js 22+ for development

## Development

```powershell
npm install
npm run desktop:dev
```

In a second terminal:

```powershell
npm run desktop:start
```

## Validation

```powershell
npm test
npm run smoke
```

`npm test` builds the renderer and exercises catalogue persistence, EPUB metadata, duplicate handling, progress, favourites, removal safety, migration, and missing files. `npm run smoke` launches Electron invisibly, loads a generated three-page PDF, renders it offline, and verifies page traversal.

## Packaging

```powershell
npm run desktop:build
```

The Windows installer and portable executable are written to `release/`. Release binaries are intentionally not committed to Git.

## Privacy

Mouseion has no account, analytics, cloud storage, or network dependency. Its catalogue is stored in the local application-data directory, while book files remain in their original locations.

## License

No license has been selected yet. Add a license before accepting outside contributions or redistributing modified builds.
