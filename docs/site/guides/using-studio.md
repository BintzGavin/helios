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

### Visual Timeline

-   **Scrubbing**: Drag the playhead to scrub through your animation.
-   **Playback**: Use the Play/Pause controls or keyboard shortcuts.
-   **Frame Stepping**: Move frame-by-frame to inspect exact details.
-   **Range Markers**: Set In (`I`) and Out (`O`) points to loop a specific section of your animation.

### Props Editor

If your composition defines an input schema or uses `inputProps`, the Studio generates a form to edit these values in real-time. Changes are reflected immediately in the preview.

### Render Configuration

The **Render** panel allows you to configure output settings without touching code:
-   **Mode**: Choose between `DOM` (for CSS/HTML) or `Canvas` (for WebGL/Canvas).
-   **Resolution**: Select presets (1080p, 720p, etc.) or custom dimensions.
-   **Codecs**: Select video codecs (H.264, VP9, AV1) and bitrates.
-   **Audio**: Enable/Disable audio export.

### Rendering

You can trigger a render job directly from the Studio UI. The progress is displayed in the sidebar, and the output file is saved to your project directory.

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
