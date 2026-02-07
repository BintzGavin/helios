---
title: "Rendering Pipeline"
description: "Deep dive into how Helios renders video files."
---

# Rendering Pipeline

The rendering process converts a dynamic web composition into a static video file. This is handled by `@helios-project/renderer`.

## 1. Orchestration

For large jobs or distributed workloads, the `RenderOrchestrator` takes charge.

1.  **Planning**: It calculates the total frames and splits the job into chunks (e.g., 2 chunks of 150 frames each for a 10s video at 30fps).
2.  **Audio Plan**: It determines how audio should be handled. To prevent glitches, video chunks are often rendered silently, and audio is mixed in a final pass.

## 2. Execution Strategy

Chunks can be executed locally (concurrently) or distributed to other machines.

### Local Execution
The `RenderOrchestrator` spawns multiple `Renderer` instances (via `LocalExecutor`) up to the configured concurrency limit. Each instance handles a specific frame range.

### Distributed Execution
The `helios job run` command reads a JSON job spec and executes specific chunks. This allows you to run Chunk 0 on Machine A and Chunk 1 on Machine B.

## 3. The Render Loop

Each `Renderer` instance performs the following loop:

1.  **Launch**: Starts a headless browser (via Playwright).
2.  **Load**: Navigates to the composition URL.
3.  **Inject**: Injects scripts to control time (`TimeDriver`).
4.  **Loop**:
    - **Seek**: Sets the virtual time to the current frame timestamp.
    - **Wait**: Waits for the composition to stabilize (`waitUntilStable`). This ensures fonts, images, and data are ready.
    - **Capture**: Takes a screenshot (DOM mode) or reads the canvas (Canvas mode).
    - **Encode**: Pipes the image data to an FFmpeg process.
    - **Advance**: Increments the frame counter.

## 4. Audio Mixing

Unlike traditional screen recording, Helios handles audio separately for high quality.

1.  **Extraction**: Audio tracks defined in `RendererOptions` (files or blobs) are prepared.
2.  **Mixing**: FFmpeg mixes these tracks according to the timeline (offset, volume, fade).
3.  **Muxing**: The final video stream is combined with the mixed audio stream.

## 5. Concatenation (Distributed)

If the render was split into chunks:
1.  **Collect**: All chunk video files are collected.
2.  **Concat**: They are losslessly concatenated into a single video stream.
3.  **Final Mix**: The global audio track is mixed into this concatenated video to produce the final output.
