# 2026-03-14 - RENDERER - Configurable Screenshot Format

## 1. Context & Goal
- **Objective**: Enable configurable image format (JPEG/PNG) and quality for intermediate frame capture in DOM mode and Canvas fallback mode.
- **Trigger**: The current implementation hardcodes `png` for DOM screenshots, which is slow and produces large files. Vision requires "Performance When It Matters".
- **Impact**: Unlocks significantly faster rendering for DOM-heavy compositions where JPEG artifacts are acceptable, and reduces memory/IO pressure.

## 2. File Inventory
- **Modify**: `packages/renderer/src/types.ts` (Add `intermediateImageFormat`, `intermediateImageQuality`)
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts` (Add constructor, update `capture`)
- **Modify**: `packages/renderer/src/strategies/CanvasStrategy.ts` (Update `captureCanvas` fallback)
- **Modify**: `packages/renderer/src/index.ts` (Pass options to `DomStrategy`)

## 3. Implementation Spec

### `packages/renderer/src/types.ts`
- ADD to `RendererOptions`:
  - `intermediateImageFormat?: 'png' | 'jpeg'` (Defaults to 'png')
  - `intermediateImageQuality?: number` (0-100, defaults to undefined/browser default). Only applicable if format is 'jpeg'.

### `packages/renderer/src/strategies/DomStrategy.ts`
- UPDATE class to accept `options: RendererOptions` in constructor.
- STORE options in private property.
- IN `capture(page, frameTime)`:
  - GET format from `options.intermediateImageFormat` (default 'png').
  - GET quality from `options.intermediateImageQuality`.
  - CALL `page.screenshot({ type: format, quality: quality })`.
  - NOTE: Playwright `quality` option is only allowed for 'jpeg'. If format is 'png', do not pass `quality`.

### `packages/renderer/src/strategies/CanvasStrategy.ts`
- IN `captureCanvas(page, frameTime)` (the fallback method):
  - GET format from `options.intermediateImageFormat` (default 'png').
  - GET quality from `options.intermediateImageQuality`.
  - CONVERT quality to 0.0-1.0 scale if present (Playwright uses 0-100, `toDataURL` uses 0-1).
  - CALL `page.evaluate` passing `{ format, quality }`.
  - INSIDE evaluate:
    - CALL `canvas.toDataURL('image/' + format, quality)`.
  - RETURN buffer from data URL.

### `packages/renderer/src/index.ts`
- UPDATE constructor:
  - PASS `this.options` when instantiating `new DomStrategy(this.options)`.

## 4. Test Plan
- **Verification**: Create a temporary test script `tests/manual-verify-format.ts`.
- **Script Logic**:
  - IMPORT `Renderer`.
  - RUN `renderer.render()` with:
    - `mode: 'dom'`
    - `intermediateImageFormat: 'jpeg'`
    - `intermediateImageQuality: 50`
    - `output: 'output-jpeg.mp4'`
  - CHECK that render completes successfully.
  - (Optional) RUN again with `format: 'png'` and compare execution time/file size if possible (manual observation).
- **Success Criteria**:
  - `tests/manual-verify-format.ts` executes without error.
  - FFmpeg output is generated.
  - Logs show no errors related to screenshot parameters.
- **Edge Cases**:
  - `format: 'png'` with `quality` provided (should ignore quality to avoid Playwright error).
  - `quality` out of bounds (Playwright might throw, but we assume user provides valid input or we clamp it).
