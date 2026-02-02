# CORE: Implement VideoExportSession

## 1. Context & Goal
- **Objective**: Implement `VideoExportSession` in `packages/core` to standardize client-side WebCodecs video encoding logic.
- **Trigger**: Vision gap "Client-Side WebCodecs as Primary Export" requires robust core primitives for driving `VideoEncoder`. Currently, logic is duplicated in player/examples or missing from the "Headless Logic Engine".
- **Impact**: Enables a "Headless Logic Engine" that can drive high-performance exports without relying on `packages/player` or manual implementation. Simplifies future "Canvas-to-Video" workflows and moves the codebase closer to the "Native Always Wins" philosophy by wrapping the standard `VideoEncoder` API.

## 2. File Inventory
- **Create**: `packages/core/src/video-export.ts`
- **Create**: `packages/core/src/video-export.test.ts`
- **Modify**: `packages/core/src/index.ts` (export new class)
- **Read-Only**: `packages/core/src/render-session.ts`, `packages/core/src/Helios.ts`

## 3. Implementation Spec
- **Architecture**: `VideoExportSession` wraps `RenderSession` and manages a `VideoEncoder` instance. It handles the synchronization between frame iteration (Helios) and the encoding loop (WebCodecs), including backpressure management (`encodeQueueSize`).
- **Pseudo-Code**:
  ```typescript
  export class VideoExportSession {
    constructor(helios, options) { ... }

    async run() {
      // 1. Check for VideoEncoder support
      if (typeof VideoEncoder === 'undefined') throw new HeliosError(ENV_ERROR);

      // 2. Configure Encoder
      const encoder = new VideoEncoder({ output: this.options.onChunk, error: ... });
      encoder.configure(this.options.config);

      // 3. Create RenderSession for iteration
      const session = new RenderSession(this.helios, { ... });

      // 4. Iterate and Encode
      for await (const frame of session) {
        // Handle Backpressure
        if (encoder.encodeQueueSize > LIMIT) await this.waitForDrain(encoder);

        // Create Frame from Source (Canvas)
        // Timestamp must be in microseconds
        const timestamp = (frame / fps) * 1_000_000;
        const videoFrame = new VideoFrame(this.options.canvas, { timestamp });

        // Encode
        encoder.encode(videoFrame, { keyFrame: shouldKeyFrame(frame) });
        videoFrame.close();
      }

      // 5. Flush
      await encoder.flush();
    }
  }
  ```
- **Public API Changes**:
  - Export `VideoExportSession` class.
  - Export `VideoExportOptions` interface.
- **Dependencies**:
  - `VideoEncoder`, `VideoFrame` (Browser APIs).
  - `RenderSession` (Internal).

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `VideoExportSession` instantiates correctly.
  - `run()` iterates frames and calls `encoder.encode()`.
  - Backpressure logic pauses execution when queue is full.
  - Throws appropriate error if `VideoEncoder` is missing.
- **Edge Cases**:
  - `VideoEncoder` not present (Node.js environment).
  - `AbortSignal` aborts the process mid-encoding.
  - Canvas source is invalid or detached.
