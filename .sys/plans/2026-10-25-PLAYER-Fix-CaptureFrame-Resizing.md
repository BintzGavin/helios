# 2026-10-25-PLAYER-Fix-CaptureFrame-Resizing

#### 1. Context & Goal
- **Objective**: Fix `captureFrame` implementations in `DirectController` and `bridge.ts` to respect requested `width` and `height` parameters when capturing from a canvas source.
- **Trigger**: `ClientSideExporter` relies on `captureFrame` to return frames of the correct size for resizing export (e.g., 4K export from 1080p preview), but the current implementation returns the raw canvas size.
- **Impact**: Ensures accurate export resolution and WYSIWYG reliability for scaled exports.

#### 2. File Inventory
- **Modify**: `packages/player/src/controllers.ts` (Update `DirectController.captureFrame`)
- **Modify**: `packages/player/src/bridge.ts` (Update `handleCaptureFrame`)
- **Read-Only**: `packages/player/src/features/exporter.ts`

#### 3. Implementation Spec
- **Architecture**: In both `DirectController.captureFrame` and `handleCaptureFrame` (in `bridge.ts`), intercept the canvas source path. Check if `options.width` and `options.height` are provided and differ from the source canvas dimensions. If so, create an intermediate canvas (preferring `OffscreenCanvas` if available, falling back to `document.createElement('canvas')`) with the target dimensions, draw the source canvas onto it using `drawImage` (which handles scaling), and use this intermediate canvas as the source for `VideoFrame` (in `controllers.ts`) or `createImageBitmap` (in `bridge.ts`).
- **Pseudo-Code**:
  ```typescript
  // Shared logic pattern for both files:
  const sourceCanvas = ...; // get from DOM
  let source: CanvasImageSource = sourceCanvas;

  if (targetWidth && targetHeight && (sourceCanvas.width !== targetWidth || sourceCanvas.height !== targetHeight)) {
      if (typeof OffscreenCanvas !== 'undefined') {
          const offscreen = new OffscreenCanvas(targetWidth, targetHeight);
          const ctx = offscreen.getContext('2d');
          if (ctx) {
              ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
              source = offscreen; // For bridge, might consider transferToImageBitmap() if optimizing transfer
          }
      } else {
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
              source = canvas;
          }
      }
  }

  // Then use `source` to create the final frame/bitmap
  // In DirectController: new VideoFrame(source, ...)
  // In Bridge: createImageBitmap(source)
  ```

#### 4. Test Plan
- **Verification**: Run `npm run build -w packages/player` to ensure type safety.
- **Success Criteria**:
  - Exporting a composition with `export-width` differing from the player's intrinsic size results in an output video of the requested resolution.
  - Verify visually that the content is scaled correctly (not cropped).
- **Edge Cases**:
  - `OffscreenCanvas` not available (fallback path logic).
  - `width`/`height` not provided (should preserve original behavior).
  - `width`/`height` same as source (should skip resizing).
