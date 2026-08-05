# Security

## Reporting a vulnerability

Please report security issues privately through GitHub's **Security → Report a vulnerability** feature rather than opening a public issue. Include the affected version, reproduction steps, and potential impact where possible.

## Windows SmartScreen

Mouseion releases are built as standard Windows executables but are not currently signed with a commercial Extended Validation code-signing certificate. Windows SmartScreen may therefore display an “unrecognized app” warning, especially for new releases with limited download reputation.

Users should download binaries only from this repository's official [Releases page](https://github.com/Anantgoel2005/Mouseion/releases). Release assets include SHA-256 digests in GitHub's metadata for integrity verification.

## Privacy model

Mouseion is offline-first. It does not include analytics, accounts, cloud storage, or telemetry. The local catalogue contains file paths and reading progress and remains in the user's application-data directory.
