# KeyFlow Desktop

KeyFlow uses Tauri 2 and the operating system's webview. The first supported build is macOS (Apple Silicon). The same wrapper includes Windows and Linux packaging; those platforms need native validation before release.

## Run on a Mac

Install Node.js 22+, the Xcode command line tools (`xcode-select --install`), and stable Rust using [rustup](https://rustup.rs). Ensure `~/.cargo/bin` is on PATH (`. "$HOME/.cargo/env"` for the current shell).

```sh
npm ci
npm run desktop:dev
```

Development embeds a snapshot of the web assets. Restart the command after changing frontend files. Browser development can still serve the project root with any static HTTP server.

```sh
npm run desktop:mac
```

The `.app` is under `src-tauri/target/release/bundle/macos/` and the drag-to-Applications `.dmg` is under `src-tauri/target/release/bundle/dmg/`. This builds for the Mac running the command. The Mac scripts use noninteractive bundling to avoid Finder automation timeouts; the DMG still contains the app and Applications shortcut, with default icon placement.

For both Intel and Apple Silicon:

```sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm run desktop:mac:universal
```

Universal output is under `src-tauri/target/universal-apple-darwin/release/bundle/`.

## Native behavior and saved data

- **⌘⇧K** brings KeyFlow forward from another app, even when its window is closed or minimized. Windows/Linux use **Ctrl+Shift+K**. The app must already be running; it does not start at login.
- On Mac, the red close button hides the window. Clicking the Dock icon reopens it. **⌘Q** fully quits and releases the shortcut.
- A second launch focuses the existing instance. Window position and size are restored.
- If another app owns the shortcut, KeyFlow still opens and displays a warning. Quit the conflicting app and restart KeyFlow to retry registration.
- Progress and custom themes use the existing synchronous `localStorage` persistence in Tauri's persistent webview profile. No account or network connection is needed. On macOS, WebKit data resides in the app's Library data directories, associated with `com.keyflow.typing-tutor`. Preserve this identifier across updates. Replacing the app does not reset its data.
- Desktop JSON, CSV, theme, and PNG exports open a native Save dialog; cancellation does not report success. Exports are limited to 32 MB.
- Browser and desktop profiles are separate. Use **Settings → Export Backup / Import Backup** to transfer progress. Custom themes can be transferred through Theme Studio's separate export/import controls.
- Desktop assets are embedded, service workers are disabled, and remote Google Fonts are omitted in favor of the existing system font fallbacks.

## Distribution

The local build is for testing. Public Mac distribution needs an Apple Developer ID signature and notarization. Configure `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD` (an app-specific password), and `APPLE_TEAM_ID` in your build environment; keep credentials out of the repository. Follow [Tauri's macOS signing guide](https://v2.tauri.app/distribute/sign/macos/). No signing credentials are supplied by this project.

Binary and installer size depend on architecture and bundled assets; 5–10 MB is a target, not a guarantee, especially for universal binaries.

The manual **Desktop packages** GitHub Actions workflow builds a universal Mac DMG, Windows NSIS installer, and Linux deb/AppImage as downloadable CI artifacts. It does not publish a release. These artifacts are unsigned unless signing is configured separately. For local Windows/Linux builds, install [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) and run `npm run desktop:build` on that OS.

## Verification before release

Run `npm test` and build the release package. On each target OS, check onboarding, a typing session, sound, theme changes, backup import/export, certificate downloads, window resizing, quit/relaunch persistence, a second launch, and the global shortcut while another app is focused. On Mac also verify closing/reopening from the Dock and quitting with ⌘Q. Test signed/notarized installers on a separate Mac before public distribution.

### Verified in this workspace

Apple Silicon release `.app` and `.dmg` build successfully. All 89 Node tests pass, including native shortcut status and export success/cancel/error handling. The embedded frontend's 74 relative module references resolve. Native UI checks covered onboarding, saved onboarding after ⌘Q/relaunch, closing the window and restoring it using ⌘⇧K from Finder, rendering, and the native Save dialog opening/cancelling. Completing a file save through macOS automation was not verified. Intel, Windows, Linux, signing, and notarization remain unverified.
