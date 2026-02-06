# 2026-02-06-PLAYER-Client-Export-Resizing

#### 1. Context & Goal
- **Objective**: Implement resizing support in `ClientSideExporter` to respect `targetWidth` and `targetHeight` options during client-side export (Snapshots and Video).
- **Trigger**: Discovery that `captureFrame` returns native canvas resolution (e.g. 1920x1080) even when a smaller resolution (e.g. 0.5x) is requested, and `ClientSideExporter` currently ignores the requested dimensions for Canvas sources.
- **Impact**: Enables users to export snapshots and videos at specific resolutions (e.g. smaller file sizes, thumbnails) regardless of the preview's rendering resolution.

#### 2. File Inventory
- **Modify**: `packages/player/src/features/exporter.ts` (Implement `processFrame` and update export logic)
- **Modify**: `packages/player/src/features/exporter.test.ts` (Add tests for resizing)
- **Read-Only**: `packages/player/src/controllers.ts`

#### 3. Implementation Spec
- **Architecture**: Refactor the existing `drawCaptions` method into a generalized `processFrame` method. This method will handle both resizing (scaling) and caption overlay using an intermediate `OffscreenCanvas` (with a DOM `HTMLCanvasElement` fallback).
- **Pseudo-Code**:
  ```typescript
  private async processFrame(frame: VideoFrame, options: ProcessingOptions): Promise<VideoFrame> {
      // 1. Determine Output Size
      const targetWidth = options.width || frame.displayWidth;
      const targetHeight = options.height || frame.displayHeight;

      // 2. Check if processing is needed (resize or captions)
      const needsResize = targetWidth !== frame.displayWidth || targetHeight !== frame.displayHeight;
      const hasCaptions = options.captions && options.captions.length > 0;

      if (!needsResize && !hasCaptions) {
          // No processing needed, return clone of original
          return frame.clone();
      }

      // 3. Create Canvas
      const canvas = createOffscreenOrDOMCanvas(targetWidth, targetHeight);
      const ctx = canvas.getContext('2d');

      // 4. Draw Scaled
      ctx.drawImage(frame, 0, 0, targetWidth, targetHeight);

      // 5. Draw Captions
      if (hasCaptions) {
          drawCaptionsToContext(ctx, options.captions, options.captionStyle);
      }

      return new VideoFrame(canvas, { timestamp: frame.timestamp });
  }
  ```
- **Video Export Logic**: Update the `export` loop to call `processFrame` for every frame, ensuring the `VideoFrame` added to `mediabunny` matches the target dimensions.
- **Video Encoder Config**: Ensure the `VideoEncodingConfig` passed to `mediabunny` includes the `width` and `height` properties set to the target dimensions.
- **Snapshot Logic**: Update the snapshot block to call `processFrame` before converting the frame to a Blob.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/player`
- **Success Criteria**:
  - Existing tests pass.
  - New test "should resize frame if target dimensions differ from source" passes:
    - Mock `VideoFrame` with 1920x1080.
    - Call `export` with `width: 960, height: 540`.
    - Verify `OffscreenCanvas` constructor was called with (960, 540).
    - Verify `drawImage` was called with dest width/height 960, 540.
  - New test "should configure video encoder with target dimensions" passes:
    - Verify `VideoSampleSource` config includes correct `width` and `height`.
- **Edge Cases**:
  - Target size matches source size (should verify no unnecessary canvas creation if no captions).
  - Only width provided (logic defaults height to frame height, caller responsible for aspect ratio).
