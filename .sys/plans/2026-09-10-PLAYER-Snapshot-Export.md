# 2026-09-10-PLAYER-Snapshot-Export.md

#### 1. Context & Goal
- **Objective**: Implement support for exporting the current frame as a PNG or JPEG image (Snapshot) in `<helios-player>`.
- **Trigger**: "Client-side export robustness" requires filling gaps in export capabilities; snapshot functionality is a standard player feature currently missing.
- **Impact**: Users can easily capture thumbnails or posters from their compositions without external tools, improving the "Studio" and general playback experience.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Update `HeliosExportOptions` interface and `export-format` attribute handling)
- **Modify**: `packages/player/src/features/exporter.ts` (Implement image capture and download logic)
- **Modify**: `packages/player/src/features/export-api.test.ts` (Add unit tests for image export)
- **Read-Only**: `packages/player/src/controllers.ts` (Reference for `captureFrame` signature)

#### 3. Implementation Spec
- **Architecture**: Extend `ClientSideExporter` to handle 'png' and 'jpeg' formats. Instead of initializing `mediabunny` for video encoding, it will capture a single frame, render it to a Canvas (handling captions if needed), and export it as a Blob.
- **Public API Changes**:
  - Update `HeliosExportOptions.format` type to include `'png' | 'jpeg'`.
  - Update `HeliosPlayer` to accept 'png' and 'jpeg' in `export-format` attribute.
- **Logic**:
  - In `ClientSideExporter.export`:
    - If format is 'png' or 'jpeg':
      - Determine frame index (start of range or current frame).
      - Call `controller.captureFrame`.
      - Create a Canvas (Offscreen or DOM).
      - Draw `VideoFrame` to Canvas.
      - If `includeCaptions` is true, draw captions on top (using existing logic or reusing `drawCaptions`).
      - Convert Canvas to Blob (`toBlob` or `convertToBlob`).
      - Trigger download.

#### 4. Test Plan
- **Verification**: Run unit tests: `npm test -w packages/player`
- **Success Criteria**:
  - `export-api.test.ts` passes new tests for PNG/JPEG export.
  - Existing video export tests continue to pass.
- **Edge Cases**:
  - Exporting image with captions.
  - Exporting image when canvas is not available (should fail gracefully or fallback).
