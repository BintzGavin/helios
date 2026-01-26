---
name: helios-studio
description: Studio tool for developing and previewing Helios compositions. Use when you want to launch the interactive development environment.
---

# Helios Studio

The Helios Studio is a Vite-based development server and preview environment. It provides a hot-reloading environment for building compositions and acts as the "Editor" interface for Helios projects.

## Quick Start

Run the studio from your project root:

```bash
npx helios studio
```

This will start a local server (typically at `http://localhost:5173`) where you can view and debug your composition.

## Features

- **Project Root Resolution:** Automatically detects your project root via `HELIOS_PROJECT_ROOT` or `process.cwd()`.
- **Vite Integration:** Uses Vite for fast HMR (Hot Module Replacement) and efficient bundling.
- **Composition Discovery:** Scans your project for valid composition entry points (e.g., `index.html`, `composition.html`).
- **Embedded Player:** Wraps your composition in the `<helios-player>` component for full playback control.

## Usage

1. **Setup:** Ensure you have a valid Helios composition (HTML + JS/TS) in your project.
2. **Launch:** Run `npx helios studio`.
3. **Develop:** Edit your source files. The Studio will automatically reload the composition while preserving timeline state (where possible).

## Environment Variables

- `HELIOS_PROJECT_ROOT`: Override the root directory scanning path.
  ```bash
  HELIOS_PROJECT_ROOT=./my-project npx helios studio
  ```

## Common Issues

- **Port in Use:** If 5173 is taken, Vite will try the next available port. Check the terminal output.
- **File Not Found:** Ensure your composition HTML file exists in the directory or subdirectories of the root.

## Source Files

- CLI Command: `packages/cli/src/commands/studio.ts`
- Studio App: `packages/studio/`
