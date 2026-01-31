---
name: render-video
description: Workflow for rendering a Helios composition to a video file. Use when you need to automate video production or export a high-quality animation.
---

# Render Video Workflow

Rendering is the process of capturing a composition frame-by-frame and encoding it into a video file (e.g., MP4). This is done using the `@helios-project/renderer` package in a Node.js environment.

## 1. Prerequisites

Ensure your composition is running. The renderer needs a URL to access the composition.
- Locally: `npm run dev` (e.g., `http://localhost:3000/composition.html`)
- Remote: Any accessible URL.

## 2. Create Render Script

Create a file named `render.js` (or `render.ts` if using `ts-node`).

```typescript
import { Renderer } from '@helios-project/renderer';
import path from 'path';

async function main() {
    // 1. Configuration
    const compositionUrl = 'http://localhost:3000/composition.html';
    const outputPath = path.resolve('output.mp4');

    // 2. Initialize Renderer
    const renderer = new Renderer({
        width: 1920,
        height: 1080,
        fps: 30,
        durationInSeconds: 10,
        // frameCount: 300, // Optional: Override durationInSeconds with exact frame count
        mode: 'canvas', // Use 'dom' if your animation uses CSS/HTML elements

        // Audio Configuration
        audioTracks: [
            { path: 'background.mp3', volume: 0.5 },
            { path: 'voiceover.wav', offset: 2 }
        ],
        audioCodec: 'aac',

        // Input Props (Dynamic Content)
        inputProps: {
            title: "Custom Render",
            color: "#00ff00"
        }
    });

    console.log(`Starting render of ${compositionUrl}...`);

    // 3. Execute Render
    try {
        await renderer.render(compositionUrl, outputPath, {
            onProgress: (p) => {
                const percent = Math.round(p * 100);
                process.stdout.write(`\rProgress: ${percent}%`);
            }
        });
        console.log(`\nDone! Saved to ${outputPath}`);
    } catch (err) {
        console.error('\nRender failed:', err);
        process.exit(1);
    }
}

main();
```

## 3. Run Render

Execute the script.

```bash
# If using ts-node
npx ts-node render.ts

# If using node (compiled js)
node render.js
```

## Troubleshooting

### "Page timeout" or "Connection refused"
- Ensure the local server hosting the composition is running.
- Check if the URL is correct and accessible in a regular browser.

### "Black output" or "Empty video"
- Ensure `helios.bindToDocumentTimeline()` is called in your composition.
- Ensure `window.helios` is exposed.
- If using `mode: 'canvas'`, ensure you are drawing to a `<canvas>` element.
- If using `mode: 'dom'`, ensure elements are visible.

### "Render hangs"
- Check if the composition has errors in the browser console.
- Enable tracing to debug:
  ```typescript
  await renderer.render(url, out, { tracePath: 'trace.zip' });
  ```

### Audio Issues
- Ensure audio file paths are correct relative to where the script is run.
- If using `mode: 'dom'` and relying on implicit audio (e.g. `<audio>` tags), ensure the elements are present in the DOM.
