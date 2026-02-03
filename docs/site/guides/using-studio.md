---
title: "Using Helios Studio"
description: "Guide to using the Helios Studio visual editor"
---

# Using Helios Studio

Helios Studio is a visual environment for previewing, debugging, and rendering your compositions. It provides a rich interface for interacting with your animations in real-time.

## Starting Studio

To start the Studio, use the Helios CLI from your project root:

```bash
npx helios studio
```

The Studio will start a local server (typically at `http://localhost:3000`) and open in your default browser.

## Features

### Omnibar (Command Palette)

Press `Cmd+K` (or `Ctrl+K`) to open the **Omnibar**. This unified command palette allows you to:
- **Search Compositions**: Quickly switch between compositions.
- **Find Assets**: Search for assets in your project.
- **Execute Commands**: Trigger actions like "Render", "Take Snapshot", or "Toggle Fullscreen".
- **Ask Assistant**: Query the Helios Assistant for help.

### Project Discovery

The Studio automatically scans your project (based on `HELIOS_PROJECT_ROOT` or current directory) to find available compositions. It lists them in the sidebar or Omnibar for easy navigation.

- **Create Composition**: You can create new compositions directly from the UI using templates for Vanilla JS, React, Vue, Svelte, and Three.js.
- **Duplicate Composition**: You can duplicate an existing composition to use as a starting point.
- **Rename Composition**: You can rename a composition (which updates the directory name and ID) from the Settings modal.
- **Delete Composition**: You can delete existing compositions (requires confirmation).

### Helios Assistant

The **Helios Assistant** is a context-aware AI helper integrated directly into the Studio.
- **Documentation Search**: Ask questions about the Helios API, and the assistant will search the documentation to provide answers.
- **Context Aware**: It understands your current composition configuration (schema, duration, etc.).
- **Access**: Trigger via the "Ask AI" button or through the Omnibar.

### Visual Timeline

-   **Scrubbing**: Drag the playhead to scrub through your animation.
-   **Playback**: Use the Play/Pause controls or keyboard shortcuts.
-   **Frame Stepping**: Move frame-by-frame to inspect exact details.
-   **Range Markers**: Set In (`I`) and Out (`O`) points to loop a specific section of your animation. These points and the loop state are **persisted** across reloads.
-   **Audio Visualization**: Audio tracks display a waveform visualization directly on the timeline, helping you synchronize animation cues with sound events.
-   **Zooming**: Use the zoom slider to expand the timeline for precise frame-level editing. The track is scrollable when zoomed in.
-   **Timecode**: Displays current time in SMPTE format (HH:MM:SS:FF) for professional timing reference.

### Stage Toolbar

-   **Safe Areas**: Toggle Title Safe and Action Safe guides to ensure your content is positioned correctly for broadcast or social media.
-   **Snapshot**: Take a PNG snapshot of the current frame.
-   **Background**: Toggle transparency grid or background color.
-   **Preferences**: Your settings (Zoom, Pan, Guides, Timeline Zoom, Current Frame, Active Composition) are automatically persisted to `localStorage`, so you can pick up exactly where you left off after a restart.

### Assets Panel

Manage your project's assets directly from the Studio.
-   **Discovery**: Automatically lists files in your project's `assets/` directory.
-   **Upload**: Drag and drop files to upload them.
-   **Renaming**: You can rename assets directly in the panel. The Studio will attempt to update references, but be careful as this changes the asset's URL.
-   **Preview**: Rich previews for Images, Video, Audio, Fonts, 3D Models (.glb/.gltf), JSON data, and Shaders.
-   **Drag & Drop**: You can drag assets from the panel directly into the Props Editor to assign them to image/video/audio inputs.

### Props Editor

If your composition defines an input schema or uses `inputProps`, the Studio generates a form to edit these values in real-time. Changes are reflected immediately in the preview.

-   **Groups**: Props can be organized into collapsible groups using the `group` property in the schema.
-   **Nested Objects/Arrays**: Supports deep editing of complex objects and arrays.
-   **Reordering**: You can reorder array items using Up/Down controls.
-   **Validation**: The UI provides immediate feedback for constraints:
    - `min` / `max`: Clamps numeric inputs and length.
    - `pattern`: Validates text against Regex.
    - `accept`: Filters file selection for assets (e.g., `image/*`).
    - `minItems` / `maxItems`: Enforces array length limits.
-   **Asset Drag & Drop**: You can drag files from the Assets Panel directly into image/video/audio inputs.

### Render Configuration

The **Render** panel allows you to configure output settings without touching code:
-   **Mode**: Choose between `DOM` (for CSS/HTML) or `Canvas` (for WebGL/Canvas).
-   **Resolution**: Select presets (1080p, 720p, etc.) or custom dimensions.
-   **Codecs**: Select video codecs (H.264, VP9, AV1) and bitrates.
-   **Audio**: Enable/Disable audio export.

### Rendering

You can trigger a render job directly from the Studio UI. The progress is displayed in the sidebar, and the output file is saved to your project directory.

-   **Persistence**: Render jobs are saved to disk, so your history is preserved even if you restart the Studio.
-   **Preview**: Once a render is complete, you can click the thumbnail to watch the video in a modal directly within the Studio.
-   **Verification**: The Render Manager automatically verifies the output file (size, existence) to ensure the render was successful, flagging failures even if FFmpeg exits cleanly.
-   **Error Reporting**: If a render fails, you can view the detailed error logs to diagnose the issue.

#### Client-Side Export

For quick previews or sharing, you can also perform a **Client-Side Export** directly in the browser (using WebCodecs). This avoids spinning up a server-side FFmpeg process and is great for shorter clips.
- Select **Client Export** in the Render Panel.
- Supports MP4 and WebM formats.
- Includes audio and burned-in captions.

### Diagnostics Panel

Accessible from the sidebar, this panel provides real-time information about your system capabilities:
-   **Client (Preview)**: Checks for WebCodecs, WebGL, and WAAPI support in your browser.
-   **Server (Renderer)**: Verifies FFmpeg availability and server-side rendering capabilities.

## Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| **Space** / **K** | Toggle Play / Pause |
| **Left Arrow** | Previous Frame |
| **Right Arrow** | Next Frame |
| **Shift + Arrow** | Jump 10 Frames |
| **Home** | Jump to Start |
| **I** | Set In Point (Loop Start) |
| **O** | Set Out Point (Loop End) |
| **Cmd+K** | Open Omnibar |
