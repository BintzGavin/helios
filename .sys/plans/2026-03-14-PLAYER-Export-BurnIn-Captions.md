# Plan: Burn-in Captions for Client-Side Export

## 1. Context & Goal
- **Objective**: Ensure that captions visible in the `<helios-player>` preview are included ("burned in") to the exported video file during client-side export.
- **Trigger**: Vision gap - "Captions/Subtitles" are rendered in preview but missing from export because they exist as a UI overlay outside the iframe/canvas.
- **Impact**: Provides parity between preview and export for videos with captions, enhancing the export feature's utility.

## 2. File Inventory
- **Modify**:
  - `packages/player/src/bridge.ts`: Update `handleCaptureFrame` to include `activeCaptions` in the response payload.
  - `packages/player/src/controllers.ts`: Update `HeliosController.captureFrame` signature to return `{ frame: VideoFrame, captions: CaptionCue[] } | null`. Implement this change in `DirectController` and `BridgeController`.
  - `packages/player/src/features/exporter.ts`: Update `export` loop to composite captions onto the video frame using an intermediate canvas before encoding.
  - `packages/player/src/features/exporter.test.ts`: Update mocks to match the new `captureFrame` signature.
- **Read-Only**: `packages/core/src/captions.ts` (for type reference).

## 3. Implementation Spec
- **Architecture**:
  - Extend the `captureFrame` contract to return metadata (captions) alongside the pixel data (VideoFrame).
  - Use an intermediate `OffscreenCanvas` (or fallback to `HTMLCanvasElement`) in `ClientSideExporter` to layer the caption text over the video frame.
  - Replicate the caption styling from `index.ts` (CSS) into the canvas drawing logic (`2d` context).

- **Pseudo-Code**:
  ```typescript
  // 1. Bridge Update (bridge.ts)
  // In handleCaptureFrame:
  const activeCaptions = helios.getState().activeCaptions || [];
  window.parent.postMessage({
      // ...
      captions: activeCaptions
  }, ...);

  // 2. Controller Update (controllers.ts)
  // Interface:
  // captureFrame(...): Promise<{ frame: VideoFrame, captions: any[] } | null>

  // DirectController:
  const frame = new VideoFrame(...);
  const captions = this.instance.getState().activeCaptions || [];
  return { frame, captions };

  // BridgeController:
  // Extract captions from event.data
  return { frame: new VideoFrame(...), captions: event.data.captions || [] };

  // 3. Exporter Update (exporter.ts)
  // In export loop:
  const result = await this.controller.captureFrame(i, ...);
  if (!result) throw new Error(...);
  const { frame, captions } = result;

  let frameToEncode = frame;

  if (captions && captions.length > 0) {
      // Create canvas (cached if possible)
      const canvas = new OffscreenCanvas(frame.displayWidth, frame.displayHeight);
      const ctx = canvas.getContext('2d');

      // Draw video frame
      ctx.drawImage(frame, 0, 0);

      // Draw captions
      captions.forEach(cue => {
          // Style: semi-transparent black bg, white text, bottom center
          // ... implementation of text wrapping and drawing ...
      });

      // Create new frame
      frameToEncode = new VideoFrame(canvas, { timestamp: frame.timestamp });
      frame.close(); // Close original
  }

  await encoder.encode(frameToEncode, ...);
  frameToEncode.close();
  ```

- **Dependencies**:
  - `OffscreenCanvas` support (or fallback).
  - `VideoFrame` support (already required for Exporter).

## 4. Test Plan
- **Verification**: Run unit tests for player package: `npm test -w packages/player`.
- **Success Criteria**:
  - `exporter.test.ts` passes with updated mocks.
  - Build succeeds: `npm run build -w packages/player`.
- **Edge Cases**:
  - No captions (should render video only).
  - Captions present but `OffscreenCanvas` not supported (fallback to `document.createElement`).
  - Text wrapping for long captions (basic implementation ok for now).
