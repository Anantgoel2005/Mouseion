# Security policy

## Supported versions

Security fixes are applied to the latest published Mouseion release.

| Version | Supported |
| --- | --- |
| Latest release | Yes |
| Older releases | No |

## Reporting a vulnerability

Please use GitHub's **Security → Report a vulnerability** flow for private disclosure rather than opening a public issue. Include the affected version, reproduction steps, expected and actual behaviour, and potential impact where possible.

Do not include private book files, personal file paths, or other sensitive local data in a report. A minimal synthetic PDF or EPUB is preferred when a sample is needed.

## Security model

Mouseion is an offline-first desktop application:

- The renderer is sandboxed, uses context isolation, and has Node integration disabled.
- A narrow preload bridge exposes only the library operations required by the interface.
- IPC requests are accepted only from the main application frame.
- The local-file protocol resolves canonical paths and serves only PDF or EPUB files already present in the catalogue.
- A restrictive Content Security Policy limits executable and embeddable content.
- The app contains no analytics, accounts, cloud storage, or telemetry.

The catalogue contains local file paths, favourites, and reading progress. It remains in the user's application-data directory. Book files remain in their original locations, and removing a catalogue entry does not delete the original file.

## Release integrity and Windows SmartScreen

Official binaries are available only from this repository's [GitHub Releases](https://github.com/Anantgoel2005/Mouseion/releases). GitHub displays a SHA-256 digest for each uploaded release asset so downloads can be checked for integrity.

Mouseion is not currently signed with a commercial code-signing certificate. Windows SmartScreen may therefore display an “unrecognized app” warning, especially for a new release with limited download reputation. This warning is a distribution limitation, not a request to disable Windows security controls; only run a binary after confirming it came from the official release page.
