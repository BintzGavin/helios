# Enhanced Diagnostics Spec

#### 1. Context & Goal
- **Objective**: Improve the `renderer.diagnose()` method to provide comprehensive environment capabilities, specifically Hardware Acceleration and Alpha Channel support for WebCodecs, and viewport metrics for DOM mode.
- **Trigger**: Vision Gap - The "Diagnostics" feature promised in the README is basic and fails to verify critical capabilities like transparency support and GPU acceleration, leading to potential user confusion.
- **Impact**: Enables developers to programmatically verify if their environment supports high-performance (Hardware) and high-quality (Alpha) rendering, preventing silent failures or sub-optimal output.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/strategies/CanvasStrategy.ts` (Update `diagnose` logic)
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts` (Update `diagnose` logic)
- **Modify**: `packages/renderer/tests/verify-diagnose.ts` (Update verification expectations)
- **Read-Only**: `packages/renderer/src/types.ts` (Reference for types)

#### 3. Implementation Spec
- **Architecture**:
  - Update the `diagnose` method in both strategies to gather deeper insights via `page.evaluate`.
  - `CanvasStrategy` will perform a matrix check of codecs (Base vs Alpha) and inspect the `VideoEncoderSupport.type` field.
  - `DomStrategy` will collect viewport and graphics context metrics.

- **Pseudo-Code**:
  - **CanvasStrategy.ts**:
    - Define a list of codec configurations to test (H.264, VP8, VP9, AV1).
    - Inside `page.evaluate`:
      - For each codec:
        - Check `isConfigSupported` with `{ alpha: 'discard' }`. Record `supported` and `type` (hardware/software).
        - Check `isConfigSupported` with `{ alpha: 'keep' }`. Record `supported`.
      - Construct a report object:
        ```json
        {
          "h264": { "supported": true, "hardware": true, "alpha": false, "type": "hardware" },
          "vp9": { "supported": true, "hardware": false, "alpha": true, "type": "software" }
        }
        ```
  - **DomStrategy.ts**:
    - Inside `page.evaluate`:
      - Get `width` = `window.innerWidth`
      - Get `height` = `window.innerHeight`
      - Get `dpr` = `window.devicePixelRatio`
      - Check `webgl` = `!!document.createElement('canvas').getContext('webgl')`
      - Return extended object.

- **Public API Changes**:
  - `Renderer.diagnose()` return type remains `Promise<any>` but the structure is enriched.
    - `browser.codecs` values change from `boolean` to `object`.
    - `browser` (DOM mode) adds `viewport`, `deviceScaleFactor`, `webgl`.

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npx tsx tests/verify-diagnose.ts`
- **Success Criteria**:
  - The script outputs the new diagnostics report.
  - `Canvas Diagnostics` shows `hardware: true` (or false) and `alpha: true/false` for codecs.
  - `DOM Diagnostics` shows `viewport` and `webgl` status.
  - The test passes without throwing type errors (updated assertions).
- **Edge Cases**:
  - Browser does not support `VideoEncoder` (already handled, returns basic info).
  - Browser does not support `type` field in `VideoEncoderSupport` (handle gracefully, maybe undefined).
