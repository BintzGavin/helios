---
name: helios-studio
description: Studio tool for developing and previewing Helios compositions. Use when you want to launch the interactive development environment or manage assets.
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
- **Safe Area Guides:** Toggle Action/Title Safe guides and Crosshair.
- **Keyboard Shortcuts:**
  - `Space`: Play/Pause
  - `Arrow Left/Right`: Step 1 frame
  - `Shift + Arrow`: Step 10 frames
  - `Home`: Seek to start
  - `I` / `O`: Set In / Out points (Playback Range)
  - `L`: Toggle Loop

### MCP Server
The Studio runs a Model Context Protocol (MCP) server, allowing AI agents to:
- Inspect composition schemas.
- Update input props.
- Trigger renders.
- Create new compositions.

### Props Editor
The Props Editor generates a UI based on your `HeliosSchema`.

- **Groups:** Organize props into collapsible sections using the `group` schema property.
- **Schema-Aware Inputs:**
  - `number`: Slider (if min/max set), Stepped Slider (if step set).
  - `color`: Color picker.
  - `boolean`: Toggle switch.
  - `string`: Text input or Enum dropdown.
  - `image`, `video`, `audio`, `font`: Asset selector with preview.
  - `model`: 3D Model selector (.glb, .gltf).
  - `json`: JSON file selector.
  - `shader`: Shader file selector (.glsl).
  - **Recursive Support:** Generates nested UIs for `object` and `array` types.
- **Drag & Drop:** Drag assets from the Assets Panel directly into compatible inputs.
- **Metadata Editing:** Click "Edit Composition" to change Width, Height, FPS, and Duration.

### Assets Management
- **Assets Panel:** View and manage files in your `assets/` directory.
- **Upload:** Drag & drop files onto the panel to upload them.
- **Previews:** Rich previews for video (hover-play), audio, fonts, and images.
- **Supported Types:**
  - Images: jpg, png, svg, webp
  - Audio: mp3, wav, ogg
  - Video: mp4, webm
  - 3D: glb, gltf
  - Data: json
  - Shaders: glsl, vert, frag

### Render Management
- **Renders Panel:** Trigger server-side renders directly from the UI.
- **Configuration:** Select format (MP4/WebM), resolution, and codec.
- **Progress:** Track render progress and cancel jobs if needed.
- **Persistent Jobs:** Render history persists across server restarts.
- **Client-Side Export:** Export directly from the browser using WebCodecs.

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
