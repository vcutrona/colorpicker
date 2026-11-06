<p align="center">
  <a href="https://colorpicker.fr">
    <img src="config/release/icon_osx.png" width="256" height="256" alt="ColorPicker icon" />
  </a>
  <h1 align="center">Colorpicker</h1>
  <p align="center">Modern and powerful color management software</p>
  <p align="center">
    <img src="https://badgen.net/github/release/toinane/colorpicker/stable" />
    <img src="https://img.shields.io/github/downloads/toinane/colorpicker/total.svg">
    <img src="https://img.shields.io/github/downloads/toinane/colorpicker/latest/total.svg">
    <img src="https://img.shields.io/github/release-date/Toinane/colorpicker.svg">
    <img src="https://github.com/Toinane/colorpicker/actions/workflows/tauri-build.yml/badge.svg">
    <a href="https://snapcraft.io/colorpicker-app">
      <img alt="colorpicker-app" src="https://snapcraft.io/colorpicker-app/badge.svg" />
    </a>
    <a href="https://crowdin.com/project/colorpicker">
      <img src="https://badges.crowdin.net/colorpicker/localized.svg">
    </a>
  </p>
</p>

---

<h4 align="center">
  Want to help with the localization of Colorpicker?
</h4>
<p align="center">
  Please connect to <a href="https://crowdin.com/project/colorpicker" target="_blank">Crowdin and join the project</a>, your contribution is highly appreciated! 👍
</p>

---

## About Colorpicker

Colorpicker is a color management software. Grab any color on your computer screen, easily adjust it to your convenience and save it in personalized color categories.

Colorpicker is built with **Tauri** (Rust + React) and runs on **Windows**, **macOS** and **Linux**.

> **Eyedropper availability:** the screen color picker is fully supported on Windows. On macOS it is an early implementation with a reduced feature set, and on Linux it is not implemented yet: the eyedropper button, its hotkey and its settings are disabled there. See [PICKER_FUNCTIONAL_DOCUMENTATION.md](PICKER_FUNCTIONAL_DOCUMENTATION.md) for details.

## Download

You can download [Colorpicker on the releases page](https://github.com/Toinane/colorpicker/releases).

## Development

#### How to contribute

Colorpicker uses **React 19** for the frontend and **Rust** for the backend via Tauri. **TypeScript** is used throughout for type safety and better developer experience.

Formatting and linting use [oxfmt](https://oxc.rs) and [oxlint](https://oxc.rs) (configured in `.oxfmtrc.json` and `.oxlintrc.json`). With **VS Code** or **Cursor**, install the recommended extensions from `.vscode/extensions.json` (Tauri, rust-analyzer, Oxc).

##### Prerequisites

- Node.js >= 22
- Rust (latest stable) - Install from [rustup.rs](https://rustup.rs/)
- Platform-specific dependencies:
  - **Windows**: Microsoft Visual Studio C++ Build Tools
  - **macOS**: Xcode Command Line Tools
  - **Linux**: `build-essential`, `libssl-dev`, `libwebkit2gtk-4.1-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`

##### Development

- Install dependencies

```shell
npm install
```

- Launch Colorpicker in development mode (Tauri)

```shell
npm run tauri:dev
```

This starts both the Vite dev server and Tauri backend with hot-reload.

- Run tests, lint and format

```shell
npm test
npm run lint
npm run format
```

- Build for production

```shell
npm run tauri:build
```

Outputs will be in `src-tauri/target/release/bundle/`

#### How to make stable release

Colorpicker uses **GitHub Actions** to build the application on all platforms without having to do it manually:

- **CI** (`.github/workflows/ci.yml`): on every push and pull request to the `tauri` branch, runs `npm run lint`, `npm test`, `cargo check`, `cargo clippy` and `cargo test`.
- **Tauri Build** (`.github/workflows/tauri-build.yml`): on every push and pull request to `dev` and `master`, builds Colorpicker for Windows, macOS and Linux and creates a **draft** GitHub release tagged `v<version>` (version from `src-tauri/tauri.conf.json`). The draft must be published manually.

`.github/workflows/master.yaml` is the legacy Electron (v2) release workflow: it runs `npm run release`, which no longer exists in this version.
