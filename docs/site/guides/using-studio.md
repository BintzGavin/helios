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

### Project Discovery

The Studio automatically scans your project (based on `HELIOS_PROJECT_ROOT` or current directory) to find available compositions. It lists them in the sidebar or command palette for easy navigation.

- **Create Composition**: You can create new compositions directly from the UI using templates for Vanilla JS, React, Vue, Svelte, and Three.js.
- **Duplicate Composition**: You can duplicate an existing composition to use as a starting point.
- **Rename Composition**: You can rename a composition (which updates the directory name and ID) from the Settings modal.
- **Delete Composition**: You can delete existing compositions (requires confirmation).

### Diagnostics Panel

Accessible from the sidebar, this panel provides real-time information about your system capabilities:
-   **Client (Preview)**: Checks for WebCodecs, WebGL, and WAAPI support in your browser.
-   **Server (Renderer)**: Verifies FFmpeg availability and server-side rendering capabilities.

### Visual Timeline

-   **Scrubbing**: Drag the playhead to scrub through your animation.
-   **Playback**: Use the Play/Pause controls or keyboard shortcuts.
-   **Frame Stepping**: Move frame-by-frame to inspect exact details.
-   **Range Markers**: Set In (`I`) and Out (`O`) points to loop a specific section of your animation.
-   **Zooming**: Use the zoom slider to expand the timeline for precise frame-level editing. The track is scrollable when zoomed in.
-   **Timecode**: Displays current time in SMPTE format (HH:MM:SS:FF) for professional timing reference.

### Stage Toolbar

-   **Safe Areas**: Toggle Title Safe and Action Safe guides to ensure your content is positioned correctly for broadcast or social media.
-   **Snapshot**: Take a PNG snapshot of the current frame.
-   **Background**: Toggle transparency grid or background color.

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
-   **Error Reporting**: If a render fails, you can view the detailed error logs to diagnose the issue.

#### Client-Side Export

For quick previews or sharing, you can also perform a **Client-Side Export** directly in the browser (using WebCodecs). This avoids spinning up a server-side FFmpeg process and is great for shorter clips.
- Select **Client Export** in the Render Panel.
- Supports MP4 and WebM formats.
- Includes audio and burned-in captions.

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
| **Cmd+K** | Open Composition Switcher |
