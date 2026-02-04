---
name: workflow-preview-composition
description: Steps to preview and develop a Helios composition in the browser using the Studio.
---

# Workflow: Preview Composition

This workflow guides you through launching the Helios Studio to preview, debug, and iterate on your video composition.

## Prerequisites
- A Helios project initialized (e.g., via `npx helios init`).
- Dependencies installed (`npm install`).

## Steps

### 1. Launch the Studio
Run the studio command from your project root.

```bash
npx helios studio
```

This starts a local Vite server, typically at `http://localhost:5173`.

### 2. Verify Output
Open the URL in your browser (Chrome/Edge recommended for best codec support).
You should see:
- The **Video Preview** in the center.
- The **Timeline** at the bottom.
- The **Controls** (Play, Pause, Volume) overlaying the video.

### 3. Using the Timeline
- **Play/Pause**: Press `Space` or click the Play button.
- **Scrubbing**: Drag the playhead on the timeline to scrub through frames.
- **Frame Stepping**: Use `Left Arrow` / `Right Arrow` to move one frame at a time.
- **Looping**: Press `L` or click the Loop button to toggle looping.

### 4. Live Editing (Hot Reloading)
Helios Studio supports Hot Module Replacement (HMR).
1. Open your code editor next to the browser.
2. Change a value (e.g., color, position, text).
3. Save the file.
4. The preview updates **instantly** without reloading the page, preserving the current frame.

### 5. Inspecting Props
If your composition uses `inputProps` defined in a schema:
1. Look for the **Props Panel** (usually on the right or toggleable).
2. Adjust sliders, toggles, or text inputs.
3. The composition reacts immediately to these changes.

## Troubleshooting

### Port Already in Use
If port 5173 is taken, the CLI will automatically try 5174, 5175, etc. Check the terminal output for the actual URL.

### "Helios not found"
Ensure you are in the root directory of your project and `node_modules` are installed.

### Canvas/Context Errors
If using WebGL/Three.js:
- Ensure you are cleaning up resources (geometries, textures) in your cleanup callbacks to avoid memory leaks during hot reloads.
- Use the `helios.subscribe` cleanup return function.

```javascript
const unsubscribe = helios.subscribe(() => { ... });
// Cleanup
return () => unsubscribe();
```
