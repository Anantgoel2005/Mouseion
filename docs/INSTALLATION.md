# Installing Mouseion on Windows

Mouseion supports 64-bit Windows 10 and newer. Official binaries are published only on the [Mouseion GitHub Releases page](https://github.com/Anantgoel2005/Mouseion/releases).

## Choose a download

| File | Use it when |
| --- | --- |
| `Mouseion-Setup-1.3.0-x64.exe` | You want a normal installation, an uninstall entry, and optional Start menu and desktop shortcuts. |
| `Mouseion-Portable-1.3.0-x64.exe` | You want to run Mouseion without installing it. |
| `SHA256SUMS.txt` | You want to confirm that the downloaded executables match the files published by the project. |

## Verify the download

Open PowerShell in the folder containing the downloaded files and run:

```powershell
Get-FileHash .\Mouseion-Setup-1.3.0-x64.exe -Algorithm SHA256
Get-FileHash .\Mouseion-Portable-1.3.0-x64.exe -Algorithm SHA256
Get-Content .\SHA256SUMS.txt
```

Compare each computed hash with the matching entry in `SHA256SUMS.txt`. Do not run a file when the values differ.

## Install Mouseion

1. Run `Mouseion-Setup-1.3.0-x64.exe`.
2. If Microsoft Defender SmartScreen appears, confirm that the publisher is listed as unknown, select **More info**, verify that the filename matches the official release, and choose **Run anyway** only if you downloaded it from this repository and verified its checksum.
3. Choose the installation directory.
4. Choose whether to create Start menu and desktop shortcuts.
5. Complete the installer and launch Mouseion.
6. Select **Add books**, then choose one or more local `.pdf` or `.epub` files.

Mouseion records catalogue metadata and reading positions under `%APPDATA%\Mouseion`. It does not copy, upload, or delete the original books.

## Run the portable edition

1. Move `Mouseion-Portable-1.3.0-x64.exe` to the folder from which you want to keep it.
2. Verify its checksum as described above.
3. Run the executable and add local PDF or EPUB files.

The portable executable does not require installation, but Mouseion still stores its catalogue and preferences under `%APPDATA%\Mouseion` so that reading progress remains available between launches.

## Upgrade

1. Close Mouseion.
2. Download and verify the newer installer or portable executable.
3. Install the new version over the existing installation, or replace the older portable executable.
4. Launch Mouseion and confirm that the existing catalogue is present.

Upgrading does not intentionally remove `%APPDATA%\Mouseion\library.json`.

## Uninstall

1. Close Mouseion.
2. Open **Settings → Apps → Installed apps**.
3. Find **Mouseion**, select its menu, and choose **Uninstall**.

Uninstalling the application does not delete original PDF or EPUB files. To remove the local catalogue and preferences as well, delete `%APPDATA%\Mouseion` after uninstalling. That final deletion cannot be undone unless the folder was backed up.

## Troubleshooting

- **SmartScreen warning:** Mouseion is not commercially code-signed. Verify the checksum and download only from the official release.
- **A book does not open:** Confirm that it is an unencrypted PDF or DRM-free EPUB and that the original file has not been moved or deleted.
- **A catalogued book is missing:** Add it again from its current location. Mouseion stores a reference to the file rather than making a copy.
- **Need to report a security problem:** Follow [SECURITY.md](../SECURITY.md) and use GitHub's private vulnerability-reporting flow.
