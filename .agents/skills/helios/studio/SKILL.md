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

### Playback & Preview
- **Interactive Timeline:** Scrub through your animation frame-by-frame.
- **Hot Reloading:** Preserves timeline state (current frame) when you edit code.
- **Audio Controls:** Volume slider and Mute toggle.
- **Keyboard Shortcuts:**
  - `Space`: Play/Pause
  - `Arrow Left/Right`: Step 1 frame
  - `Shift + Arrow`: Step 10 frames
  - `Home`: Seek to start

### Assets Management
- **Assets Panel:** View and manage files in your `assets/` directory.
- **Upload:** Drag & drop files to upload them to your project.
- **Previews:** Rich previews for video (hover-play), audio, and fonts.

### Composition Controls
- **Props Editor:** JSON-based editor to modify `inputProps` dynamically without changing code.
- **Resolution:** Switch between presets (1080p, 720p, Instagram, etc.) or set custom canvas sizes.
- **Snapshots:** Take a PNG snapshot of the current frame (Camera icon).

### Render Management
- **Renders Panel:** Trigger server-side renders directly from the UI.
- **Configuration:** Select format (MP4/WebM), resolution, and codec.
- **Progress:** Track render progress and cancel jobs if needed.

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
