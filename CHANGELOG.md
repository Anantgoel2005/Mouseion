# Changelog

Notable changes to Mouseion are documented here. Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- A reproducible animated product walkthrough generated from real Electron smoke-test states.
- A complete Windows installation, checksum, upgrade, portable-use, and uninstallation guide.

### Changed

- Expanded the Electron smoke flow to cover favourites, catalogue search, reading progress, and second-page render completion.

## [1.3.0] - 2026-08-11

### Added

- Windows CI for type checking, tests, Electron smoke coverage, dependency auditing, and unpacked packaging.
- CodeQL scanning and Dependabot update configuration.
- End-to-end EPUB and PDF smoke fixtures with optional real-app screenshot capture.
- Tests for the allow-listed local book protocol.

### Changed

- Hardened renderer-to-main IPC so library operations are accepted only from the main frame.
- Restricted the custom file protocol to catalogued PDF and EPUB paths.
- Added a restrictive Content Security Policy to the desktop renderer.
- Updated React, Vite, Electron, Electron Builder, and related development dependencies.
- Expanded project, privacy, verification, and release documentation.

### Security

- Resolved all dependency vulnerabilities reported by `npm audit` at release preparation time.

[Unreleased]: https://github.com/Anantgoel2005/Mouseion/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/Anantgoel2005/Mouseion/compare/v1.2.0...v1.3.0
