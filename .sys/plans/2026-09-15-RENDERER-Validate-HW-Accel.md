# Plan: Validate and Log FFmpeg Hardware Acceleration

## 1. Context & Goal
- **Objective**: Enhance `Renderer.render()` to inspect and log FFmpeg hardware acceleration capabilities and validate the requested `hwAccel` option, ensuring users are aware of GPU availability and configuration mismatches.
- **Trigger**: Journal entry `[2026-09-15] - FFmpeg Hardware Acceleration Visibility Gap` identified that users are blind to GPU availability and configuration mismatches, especially in distributed environments.
- **Impact**: Provides immediate feedback to users when their requested hardware acceleration (e.g., 'cuda') is not supported by the environment, preventing silent failures or unoptimized rendering.

## 2. File Inventory
- **Modify**: `packages/renderer/src/Renderer.ts`
  - Logic to call `FFmpegInspector.inspect` and validate `options.hwAccel`.
- **Create**: `packages/renderer/tests/verify-hwaccel-validation.ts`
  - A verification script to confirm that a warning is logged when an invalid `hwAccel` method is requested.
- **Read-Only**: `packages/renderer/src/utils/FFmpegInspector.ts`

## 3. Implementation Spec
- **Architecture**:
  - In `Renderer.render()`, before spawning FFmpeg:
    - Call `FFmpegInspector.inspect(ffmpegPath)` to get capabilities.
    - Log the FFmpeg version and available `hwaccels` using `[Helios Diagnostics]` prefix.
    - If `options.hwAccel` is defined AND `options.hwAccel !== 'auto'`:
      - Check if `options.hwAccel` exists in the `hwaccels` array.
      - If not found, log a `console.warn` with `[Helios Warning]` prefix, listing available accelerations.
- **Pseudo-Code (Renderer.ts)**:
  ```typescript
  // Inside render() method
  const ffmpegPath = this.options.ffmpegPath || ffmpeg.path;
  const ffmpegInfo = FFmpegInspector.inspect(ffmpegPath);

  console.log(`[Helios Diagnostics] FFmpeg Version: ${ffmpegInfo.version}`);
  console.log(`[Helios Diagnostics] FFmpeg HW Accel: ${ffmpegInfo.hwaccels.join(', ') || 'none'}`);

  if (this.options.hwAccel && this.options.hwAccel !== 'auto') {
    if (!ffmpegInfo.hwaccels.includes(this.options.hwAccel)) {
      console.warn(`[Helios Warning] Hardware acceleration '${this.options.hwAccel}' was requested but is not listed in 'ffmpeg -hwaccels' output. Available: ${ffmpegInfo.hwaccels.join(', ') || 'none'}`);
    }
  }
  ```
- **Public API Changes**: None (internal logging/validation change).
- **Dependencies**: None.

## 4. Test Plan
- **Verification Script**: `tests/verify-hwaccel-validation.ts`
  - **Setup**:
    - Instantiate `Renderer` with `hwAccel: 'fake-accel'`.
    - Spy on `console.warn` (override it temporarily).
  - **Execution**:
    - Call `renderer.render()` with a minimal data-URI composition.
    - Catch the expected FFmpeg error (since 'fake-accel' is invalid).
  - **Assertion**:
    - Verify that `console.warn` was called with a message containing "Hardware acceleration 'fake-accel' was requested but is not listed".
  - **Cleanup**: Restore `console.warn` and delete any temp files.
- **Success Criteria**: The verification script passes, confirming the warning is logged.
- **Edge Cases**:
  - `hwAccel: 'auto'` should NOT trigger a warning.
  - `hwAccel` matching a valid method (e.g. 'cuda' if available) should NOT trigger a warning (harder to test without GPU, but 'auto' logic covers the skip).
