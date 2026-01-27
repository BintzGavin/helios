#### 1. Context & Goal
- **Objective**: Optimize `CanvasStrategy` to support adaptive intermediate bitrate for high-resolution renders and ensure fonts are preloaded.
- **Trigger**: identified gap in "Production Quality" vision; 4K renders are constrained to 25Mbps intermediate bitrate, and custom fonts may not load before the first frame.
- **Impact**: Improves visual quality for high-resolution/high-FPS exports and eliminates potential font rendering glitches.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/renderer/src/strategies/CanvasStrategy.ts` (Update `prepare` method)
- **Read-Only**: `packages/renderer/src/types.ts`

#### 3. Implementation Spec
- **Architecture**: Enhances `prepare` lifecycle method in `CanvasStrategy`. No architectural changes.
- **Pseudo-Code**:
  ```text
  METHOD prepare(page):
    CALCULATE width, height from page viewport

    // 1. Font Preloading
    CALL page.evaluate:
       AWAIT document.fonts.ready

    // 2. Adaptive Bitrate
    PARSE targetBitrate from options.videoBitrate (if present)

    SET bpp = 0.2 (Bits Per Pixel for High Quality)
    SET fps = options.fps DEFAULT 60
    CALCULATE autoBitrate = width * height * fps * bpp

    SET intermediateBitrate = MAX(25_000_000, targetBitrate, autoBitrate)

    // ... rest of existing WebCodecs setup ...
    PASS intermediateBitrate to page.evaluate
  ```
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**:
  - Run `npm run render:canvas-example` (or similar valid render command).
  - Check console logs for "CanvasStrategy: Using WebCodecs..." to confirm the bitrate.
- **Success Criteria**:
  - The logged bitrate is significantly higher than 25,000,000 for a high-res/high-fps render.
  - No errors during font loading.
- **Edge Cases**:
  - `options.videoBitrate` explicitly set to low value (should be respected? No, `intermediateBitrate` is a floor for *capture*).
