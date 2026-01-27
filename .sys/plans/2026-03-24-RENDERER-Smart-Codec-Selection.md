# 2026-03-24 - RENDERER - Smart Codec Selection for Stream Copy

#### 1. Context & Goal
- **Objective**: Optimize the "Stream Copy" rendering path by automatically selecting a compatible intermediate codec (H.264) when the user requests `videoCodec: 'copy'`, eliminating unnecessary transcoding.
- **Trigger**: Currently, `CanvasStrategy` defaults to VP8 (IVF) even when `videoCodec: 'copy'` is requested, which often leads to incompatibility with MP4 containers or requires explicit, manual configuration by the user.
- **Impact**: Improves performance and usability for the most common rendering use case (MP4 export) by enabling direct stream copy from WebCodecs to FFmpeg without re-encoding.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/strategies/CanvasStrategy.ts` - Update `prepare` method to implement smart codec selection logic.
- **Create**: `packages/renderer/tests/verify-smart-codec-selection.ts` - Verification script to ensure the logic correctly prioritizes codecs based on options and environment support.

#### 3. Implementation Spec
- **Architecture**:
  - Update `CanvasStrategy.prepare(page)` to determine a list of candidate codecs before initializing WebCodecs.
  - Prioritization Logic:
    1. If `options.intermediateVideoCodec` is explicitly set, use it.
    2. Else, if `options.videoCodec === 'copy'`, prioritize H.264 (`avc1.4d002a`) as the primary candidate, with VP8 as a fallback.
    3. Else (default), use VP8.
  - Refactor the `page.evaluate` block to accept this list of candidates (instead of a single config) and iterate through them using `VideoEncoder.isConfigSupported`.
  - The browser context should return the first supported configuration found.
  - Update `this.useWebCodecs` and `this.useH264` based on the selected configuration.
  - Log the selected codec to the console for transparency (e.g., "Smart Codec Selection: selected 'avc1' for copy mode").

- **Pseudo-Code**:
  ```typescript
  // In CanvasStrategy.prepare()
  candidates = []
  IF options.intermediateVideoCodec THEN
    candidates.push(options.intermediateVideoCodec)
  ELSE IF options.videoCodec == 'copy' THEN
    candidates.push('avc1.4d002a') // H.264 High Profile
    candidates.push('vp8')         // Fallback
  ELSE
    candidates.push('vp8')

  result = await page.evaluate(checkSupport(candidates))
  IF result.supported THEN
    SET this.useH264 = result.isH264
    SET this.useWebCodecs = true
  ```

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npx ts-node packages/renderer/tests/verify-smart-codec-selection.ts`
- **Success Criteria**:
  - **Scenario A (Copy Mode)**: When instantiated with `videoCodec: 'copy'`, the strategy selects H.264 (if supported) and `getFFmpegArgs` returns arguments including `-f h264`.
  - **Scenario B (Default)**: When instantiated with defaults, the strategy selects VP8 and `getFFmpegArgs` returns `-f ivf`.
  - **Scenario C (Fallback)**: If H.264 is forced to be unsupported (via mock), Scenario A should fallback to VP8.
- **Edge Cases**:
  - Environment does not support H.264 (handled by fallback test).
  - Explicit `intermediateVideoCodec` overrides the smart logic.
