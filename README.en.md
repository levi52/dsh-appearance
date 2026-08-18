<div align="center">

# 🎨 dsh-appearance

**Appearance plugin for the DeepSeek Harness Web UI: themes, accent colors, fonts and wallpapers — personalize your Web UI in one click.**

English · [中文](README.md)

![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)
![Node >= 18](https://img.shields.io/badge/node-%3E%3D18-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)
[![CI](https://img.shields.io/github/actions/workflow/status/levi52/dsh-appearance/ci.yml?label=CI)](https://github.com/levi52/dsh-appearance/actions)
[![Developed with DeepSeek Harness](https://img.shields.io/badge/Built%20with-DeepSeek%20Harness-4d6bfe.svg)](https://www.deepseek.com/harness/)

</div>

---

## Features

- 🎨 **Themes**: Light / Dark / System plus 9 presets (Claude, GitHub, Neo-brutalism, Terminal, Dracula, Tokyo Night, Gruvbox, Solarized, Material), and a **custom theme** editor (5 key colors, everything else derived automatically)
- 🌈 **Accent color**: 8 presets + a custom color picker, stacked over any theme, with WCAG-computed readable on-accent text
- 🔤 **Fonts**: UI font / code font (default, sans-serif, serif, monospace, custom), a **system font picker** (browse locally installed fonts), and three font-size steps
- 🖼️ **Wallpaper**: upload or paste an image URL; a **gallery of previously used wallpapers** to switch and delete; opacity (up to a clean, mask-free wallpaper) and blur controls
- 📤 **Export / Import**: the whole appearance config as JSON — backup, share, migrate
- ⚡ **Quick switcher**: an “Appearance” button in the sidebar footer to switch theme and accent instantly
- 💾 **Automatic persistence**: everything is stored in `$DSH_HOME/settings.yaml` and restored on reload
- 🧩 **Draft workflow**: edits land in a draft; click “Save & Apply” to commit, or discard

## Installation

### Requirements

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh` CLI) installed with a booted web profile
- Node.js ≥ 18 (v22 in dev)

### Steps

```bash
# 1. One-command install (registers the bundle into the web profile):
npm run install-plugin
#    Equivalent to the single manual step below; pass --profile <name> for
#    other profiles:
#    dsh plugin --profile web add <this-directory>

# 2. Restart dsh web
```

### Uninstall

```bash
npm run uninstall-plugin
#    Removes the bundle. Your user data (the ui-appearance section of
#    settings.yaml and the wallpapers/ directory) is kept — delete it manually
#    if you want it gone.
```

> Client-only changes (themes, fonts, wallpaper settings, …) only need a **hard browser refresh**; host-side changes (schema, routes) need a restart.

## Settings UI

| Section | Description |
|---|---|
| **Theme** | Light/Dark/System, 9 presets, and the custom card (click to toggle the editor) |
| **Accent** | Preset swatches + custom color picker; “Theme default” applies none |
| **Fonts** | UI font, code font, font size (UI scale) |
| **Background image** | Upload / URL / gallery switch & delete, opacity, blur |
| **Actions** | Save & Apply, Discard, Reset, Export, Import |

## Data storage

- **Settings**: the `ui-appearance:` section of `$DSH_HOME/settings.yaml` (small fields only)
- **Wallpaper images**: `$DSH_HOME/wallpapers/` (uploaded files; settings store only the served URL, never the big payload)

## Development

```bash
npm run typecheck   # type check
npm run build       # build lib/ artifacts
npm run watch       # rebuild on src/ changes
```

Source lives in `src/` (host `index.ts`, browser `client/index.ts`); build output goes to `lib/`.

## How it works

- Themes override the `--dsw-alias-*` color tokens; presets are authored as compact palettes and expanded into the full token set
- Wallpapers are stored via host routes (`/dsh-appearance/*`) and shown through a translucent surface layer tinted with the active theme
- Third-party/custom theme ids are stored in `ui-appearance.theme` (the built-in `ui-theme.preference` only accepts light/dark/system)
- **How settings reach the browser**: on startup the Host half registers the `ui-appearance` settings namespace via `ctx.settings.register`; the DSH gateway exposes **every registered namespace** to the browser (registration IS the exposure — there is no whitelist to maintain). So installation never requires editing DSH files: once the bundle is mounted and the Host half is running, the settings page can read/write `ui-appearance` and persist it to `$DSH_HOME/settings.yaml`. If settings do not stick, verify the bundle is registered (re-run the install and restart dsh web) rather than patching gateway code.

## Security

- All data stays local (`$DSH_HOME`); nothing is uploaded
- The wallpaper upload endpoint accepts images only, with filename whitelisting against path traversal
- No credentials or keys are collected

## 🤖 AI declaration

Built with [DeepSeek Harness](https://www.deepseek.com/harness/).

## License

[MIT](LICENSE) © Levi5
