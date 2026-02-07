# Context & Goal
- **Objective**: Implement resizing for Canvas-based export to support `export-width` / `export-height` attributes and enhance the Export Menu with standard resolution options.
- **Trigger**: Discovery that `export-mode="canvas"` ignores target resolution, causing a functional gap against the documentation and "Configurable Export Resolution" feature.
- **Impact**: Users can export canvas-based compositions at any resolution (e.g. downscaling 4K to 1080p), and the UI will offer standard resolution presets.

# File Inventory
- **Modify**: `packages/player/src/bridge.ts` (Implement resizing in `handleCaptureFrame` using `createImageBitmap` options).
- **Modify**: `packages/player/src/controllers.ts` (Implement resizing in `DirectController.captureFrame` using `createImageBitmap` options).
- **Modify**: `packages/player/src/index.ts` (Update `renderExportMenu` to include 720p, 1080p, 4K options).
- **Create**: `packages/player/tests/export-resize.test.ts` (New test to verify resizing logic).

# Implementation Spec
- **Architecture**: Use `createImageBitmap(source, { resizeWidth, resizeHeight, resizeQuality: 'high' })` API.
- **Bridge Logic**: In `handleCaptureFrame`, if `width` and `height` are present, pass them to `createImageBitmap` options.
- **Direct Logic**: In `DirectController.captureFrame`, replace `new VideoFrame(canvas)` with `createImageBitmap(canvas, { ... })` then `new VideoFrame(bitmap)`.
- **UI Logic**: Update `renderExportMenu` to calculate "Original" dimensions, then offer:
    - "Original (WxH)"
    - "4K (3840x2160)" (if original > 4K or close)
    - "1080p (1920x1080)" (if original != 1080p)
    - "720p (1280x720)" (if original != 720p)
    - "Half (WxH)" (Legacy option)
- **Dependencies**: `packages/player/src/features/exporter.ts` relies on `controller.captureFrame` returning the correctly sized frame.

# Test Plan
- **Verification**: Run `npm run test -w packages/player`.
- **New Test**: `export-resize.test.ts` will mock `createImageBitmap` (since JSDOM might not support resize options fully, verify mocking strategy) and assert that `captureFrame` calls it with correct dimensions.
- **Success Criteria**:
    - `captureFrame` returns resized `VideoFrame` (verified via mocks/spies).
    - Export Menu shows correct options.
    - All existing tests pass.
