---
name: helios-getting-started
description: Installation and quick start guide for Helios video engine. Use when setting up a new Helios project, installing packages, or creating your first composition. Covers package installation, requirements, basic setup, and initial composition structure.
---

# Helios Getting Started

Quick installation and setup guide for Helios, a browser-native video engine for programmatic animation and rendering.

## Requirements

Before installing Helios, ensure you have:

- **Node.js**: v18 or higher (recommended)
- **npm** or **yarn** package manager
- **Chrome/Chromium**: Required for rendering (automatically installed by Playwright)

### FFmpeg (Automatically Included)

**Good news:** FFmpeg is automatically bundled with `@helios-project/renderer` via the `@ffmpeg-installer/ffmpeg` package. You don't need to install it manually!

The renderer package includes platform-specific FFmpeg binaries that work out of the box. If you prefer to use a system-installed FFmpeg instead, you can specify a custom path via the `ffmpegPath` option in the renderer configuration.

## Installation

Helios is modular—install only what you need.

### Core Package (Required)

The `@helios-project/core` package contains the engine logic, timing drivers, and animation helpers. This is required for any composition.

```bash
npm install @helios-project/core
```

### Renderer Package (Recommended)

The `@helios-project/renderer` package is a Node.js library for rendering compositions to video files (MP4, etc.) using Headless Chrome and FFmpeg. **Most users want to create MP4 files**, so this is the recommended second package.

```bash
npm install @helios-project/renderer
```

### Quick Install (Core + Renderer)

For most use cases—creating MP4 videos—install both core and renderer:

```bash
npm install @helios-project/core @helios-project/renderer
```

### Player Package (Optional - For Preview/Development)

The `@helios-project/player` package provides the `<helios-player>` web component for embedding compositions with playback controls. Useful for previewing compositions during development, but not required for rendering.

```bash
npm install @helios-project/player
```

## Basic Setup

### 1. Create a Composition File

Create an HTML file (e.g., `composition.html`) that will serve as your composition:

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Composition</title>
    <style>
        body { margin: 0; overflow: hidden; background: black; }
        canvas { display: block; width: 100vw; height: 100vh; }
    </style>
</head>
<body>
    <canvas id="canvas"></canvas>
    <script type="module" src="./src/main.js"></script>
</body>
</html>
```

### 2. Initialize Helios

In your JavaScript file (`src/main.js`), import and initialize Helios:

```typescript
import { Helios } from '@helios-project/core';

// Create a 10-second video at 30fps
const helios = new Helios({
  duration: 10,  // seconds
  fps: 30,
  width: 1920,
  height: 1080,
  autoSyncAnimations: true  // Sync CSS/WAAPI animations
});

// Bind to document timeline (CRITICAL for Renderer/Player)
helios.bindToDocumentTimeline();

// Expose to window (CRITICAL for detection)
window.helios = helios;

// Subscribe to frame updates
helios.subscribe((state) => {
  const { currentFrame, duration, fps } = state;
  const progress = currentFrame / (duration * fps);
  
  // Render your frame here
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  
  // Example: Draw something based on progress
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width * progress, canvas.height);
});

// Initial render
const state = helios.getState();
helios.subscribe((state) => {
  // Render logic here
})();
```

### 3. Use Standard CSS Animations

Your existing CSS animations work without modification:

```css
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.my-element {
  animation: fadeIn 1s ease-out forwards;
}
```

When you call `helios.seek(45)`, all CSS/WAAPI animations instantly update to frame 45.

### 4. Render to Video

**This is the primary use case**—most users want to create MP4 files from their compositions.

Use the CLI to render your composition:

```bash
npx helios render ./composition.html -o output.mp4
```

Or use the Renderer package programmatically:

```typescript
import { render } from '@helios-project/renderer';

await render({
  input: './composition.html',
  output: './output.mp4',
  width: 1920,
  height: 1080,
  fps: 30
});
```

### 5. Preview with the Player (Optional)

If you installed the player package, use the `<helios-player>` web component for preview during development:

```html
<helios-player src="./composition.html" width="1920" height="1080"></helios-player>
<script type="module" src="@helios-project/player"></script>
```

## Framework Integration

Helios works with any framework or vanilla JavaScript:

**React:**
```typescript
import { useVideoFrame } from '@helios-project/core/react';

function MyComponent() {
  const { currentFrame } = useVideoFrame();
  return <div>Frame: {currentFrame}</div>;
}
```

**Vue:**
```typescript
import { useVideoFrame } from '@helios-project/core/vue';

const { currentFrame } = useVideoFrame();
```

**Svelte:**
```typescript
import { videoFrame } from '@helios-project/core/svelte';

$: currentFrame = $videoFrame.currentFrame;
```

**Vanilla JS:**
```typescript
helios.subscribe(state => {
  console.log(state.currentFrame);
});
```

## Checklist

When setting up a new Helios composition, ensure:

- [ ] **Core package installed**: `npm install @helios-project/core`
- [ ] **Renderer package installed** (for MP4 output): `npm install @helios-project/renderer`
- [ ] **Helios instance created**: `new Helios({ duration, fps })`
- [ ] **Timeline bound**: `helios.bindToDocumentTimeline()` called
- [ ] **Window exposed**: `window.helios = helios` set
- [ ] **State subscribed**: `helios.subscribe(...)` used to trigger renders
- [ ] **Canvas/DOM ready**: Elements are sized correctly

## Next Steps

- See `helios/core` skill for detailed API reference
- See `helios/workflows/create-composition` for composition creation workflow
- See `helios/examples/react` or `helios/examples/vue` for framework-specific patterns
- See `helios/renderer` for rendering pipeline details

## Troubleshooting

**"Cannot find module '@helios-project/core'"**
- Ensure you've run `npm install @helios-project/core`
- Check that your bundler (Vite, Webpack, etc.) is configured correctly

**Animations not syncing**
- Ensure `autoSyncAnimations: true` is set in the Helios constructor
- Call `helios.bindToDocumentTimeline()` after creating the instance

**Renderer fails**
- FFmpeg is bundled with the renderer package, so no manual installation needed
- Check that Chrome/Chromium is available (Playwright should install it automatically)
- If you need to use a custom FFmpeg path, set `ffmpegPath` in renderer options

**Player not detecting composition**
- Ensure `window.helios = helios` is set
- Verify the composition HTML file path is correct
