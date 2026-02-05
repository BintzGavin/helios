# Context: Renderer

## A. Strategy: Dual-Path Architecture

The Renderer employs a Strategy pattern to support two distinct rendering modes, ensuring both visual fidelity and performance.

1.  **Canvas Strategy (Canvas Mode)**:
    -   **Target**: High-performance, frame-accurate rendering of HTML5 Canvas elements (WebGL/2D).
    -   **Mechanism**: Uses `playwright` to inject scripts that capture frames directly from the `<canvas>` element using `VideoEncoder` (WebCodecs) or `toDataURL` (fallback).
    -   **Time Driver**: `CdpTimeDriver`. Uses Chrome DevTools Protocol (`HeadlessExperimental`) to deterministically control virtual time, ensuring perfect synchronization for `requestAnimationFrame` and overriding `performance.now()` to eliminate drift.
    -   **Output**: Pipes raw image buffers or encoded chunks (H.264/VP9/AV1) to FFmpeg stdin.

2.  **Dom Strategy (DOM Mode)**:
    -   **Target**: Rendering of standard DOM elements (HTML/CSS animations).
    -   **Mechanism**: Uses `page.screenshot()` to capture the viewport at each frame.
    -   **Time Driver**: `SeekTimeDriver`. Polyfills `Date.now`, `performance.now`, and `requestAnimationFrame`, and manually advances time. It aggressively preloads assets (images, fonts, media) and waits for `seeked` events on `<video>`/`<audio>` elements to ensure zero artifacts.
    -   **Output**: Pipes PNG/JPEG buffers to FFmpeg stdin.

**Orchestration (Distributed Rendering)**:
-   The `RenderOrchestrator` splits large render jobs into concurrent chunks.
-   **Phase 1**: Renders silent video chunks (`.mov`) using uncompressed PCM audio (`pcm_s16le`) to capture implicit audio (DOM) without compression artifacts.
-   **Phase 2**: Concatenates chunks into a master PCM intermediate file.
-   **Phase 3**: Transcodes the master file to the final output format (e.g., MP4/AAC) and mixes in explicit audio tracks.

## B. File Tree

```
packages/renderer/
├── src/
│   ├── index.ts                # Entry point
│   ├── Renderer.ts             # Main class, handles lifecycle
│   ├── Orchestrator.ts         # Distributed rendering logic
│   ├── concat.ts               # Video concatenation utility
│   ├── types.ts                # Interfaces (RendererOptions, etc.)
│   ├── drivers/
│   │   ├── TimeDriver.ts       # Interface
│   │   ├── CdpTimeDriver.ts    # CDP-based time control
│   │   └── SeekTimeDriver.ts   # Polyfill-based time control
│   ├── strategies/
│   │   ├── RenderStrategy.ts   # Interface
│   │   ├── CanvasStrategy.ts   # WebCodecs/Canvas capture
│   │   └── DomStrategy.ts      # Screenshot-based capture
│   └── utils/
│       ├── FFmpegBuilder.ts    # Argument generation
│       ├── FFmpegInspector.ts  # Diagnostics
│       ├── blob-extractor.ts   # Blob URL handling
│       └── dom-scanner.ts      # DOM media discovery
```

## C. Configuration

The `RendererOptions` interface controls the rendering process:

```typescript
interface RendererOptions {
  width: number;
  height: number;
  fps: number;
  durationInSeconds: number;
  frameCount?: number;          // Override duration with exact frame count
  startFrame?: number;          // Start rendering from this frame
  mode?: 'canvas' | 'dom';      // Strategy selection
  videoCodec?: string;          // e.g., 'libx264', 'libvpx-vp9', 'copy'
  audioCodec?: string;          // e.g., 'aac', 'libvorbis', 'pcm_s16le'
  pixelFormat?: string;         // e.g., 'yuv420p', 'yuva420p'
  quality?: number;             // 1-100 (JPEG quality)
  videoBitrate?: string;        // e.g., '2500k', '5M'
  audioBitrate?: string;        // e.g., '128k'
  audioTracks?: AudioTrackConfig[]; // Explicit audio mixing
  inputProps?: Record<string, any>; // Injected into window.__HELIOS_PROPS__
  canvasSelector?: string;      // Selector for target canvas (default: 'canvas')
  subtitles?: string;           // Path to SRT file for burning
  concurrency?: number;         // Workers for distributed rendering
  mixInputAudio?: boolean;      // Mix audio from input video (stream 0:a)
}
```

## D. FFmpeg Interface

The Renderer spawns an FFmpeg process and pipes frame data to its `stdin`.

**Common Flags**:
-   `-y`: Overwrite output.
-   `-f image2pipe`: For DOM rendering (reading images from pipe).
-   `-c:v libx264`: Default video encoder.
-   `-pix_fmt yuv420p`: Standard pixel format.
-   `-preset fast`: Encoding speed.
-   `-crf 23`: Constant Rate Factor (quality).
-   `-movflags +faststart`: Web-optimized metadata.
-   `-filter_complex`: Used for mixing multiple audio tracks (`amix`) or burning subtitles (`subtitles`).

**Audio Pipeline**:
-   Inputs are normalized (mono -> stereo) using `aformat`.
-   Timeline positioning uses `adelay`.
-   Playback rate uses `atempo`.
-   Fading uses `afade`.
