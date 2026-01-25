# Context & Goal
- **Objective**: Enable rendering specific frame ranges (subsets) of a composition by adding a `startFrame` option to `RendererOptions`.
- **Trigger**: The primary vision gaps (Dual-Path, GPU, No Disk I/O) are confirmed implemented. The next logical step towards the V2 "Distributed Rendering" vision is enabling the renderer to process specific chunks of a video.
- **Impact**: Unlocks parallel rendering by decoupling the output video timeline from the composition timeline.

# File Inventory
- **Modify**: `packages/renderer/src/types.ts`
  - Add optional `startFrame` property to `RendererOptions`.
- **Modify**: `packages/renderer/src/index.ts`
  - Update the main render loop to support starting from a non-zero frame.
  - Ensure the render loop drives the page to `startFrame + i` but captures for output timestamp `i`.
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts`
  - Update `getFFmpegArgs` to offset audio input if a start frame is provided.
- **Modify**: `packages/renderer/src/strategies/CanvasStrategy.ts`
  - Update `getFFmpegArgs` to offset audio input if a start frame is provided.
- **Create**: `packages/renderer/tests/verify-range-render.ts`
  - A verification script to ensure the renderer handles `startFrame` correctly.

# Implementation Spec
- **Architecture**:
  - The `Renderer` class currently ties the composition's current time 1:1 with the output video's timestamp.
  - To support chunking, we must decouple these:
    - **Composition Time**: The absolute time in the animation (e.g., 10s).
    - **Output Time**: The relative time in the generated video file (e.g., 0s).
  - FFmpeg's `-ss` (seek) argument will be used to ensure audio aligns with the video chunk.

- **Pseudo-Code**:
  ```text
  // Main Render Loop Logic

  SET startFrame = options.startFrame DEFAULT 0
  SET totalFrames = options.durationInSeconds * options.fps

  FOR i from 0 to totalFrames:
    // Output time starts at 0 for the new video file
    CALCULATE outputTime = i / fps

    // Composition time starts at startFrame
    CALCULATE compositionTime = (startFrame + i) / fps

    // Drive the browser to the absolute composition time
    CALL timeDriver.setTime(page, compositionTime)

    // Capture the frame using outputTime (for WebCodecs timestamp continuity)
    CAPTURE buffer using strategy.capture(page, outputTime)

    WRITE buffer to FFmpeg pipe
  END FOR
  ```

  ```text
  // Strategy FFmpeg Args Logic

  CALCULATE startTime = startFrame / fps

  IF audioFilePath exists AND startTime > 0:
    ADD ['-ss', startTime] to audio input arguments
  ELSE:
    Use standard audio input arguments
  ```

- **Public API Changes**:
  - `RendererOptions` interface updated to include `startFrame`.

- **Dependencies**:
  - None.

# Test Plan
- **Verification**:
  - Run the new verification script: `npx ts-node packages/renderer/tests/verify-range-render.ts`
  - The script should:
    1. Instantiate `Renderer` with `startFrame: 30` (1 second at 30fps) and `durationInSeconds: 1`.
    2. Render a simple composition.
    3. Verify `packages/renderer/test-output-range.mp4` exists.
- **Success Criteria**:
  - Script exits with code 0.
  - Output file is created.
- **Edge Cases**:
  - `startFrame` undefined (should default to 0).
  - Audio sync: Ensure `-ss` is applied only to audio input, not video pipe.
