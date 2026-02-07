# Spec: FFmpeg Hardware Acceleration Discovery

## 1. Context & Goal
- **Objective:** Enable `FFmpegInspector` to detect and report supported hardware acceleration methods (e.g., `cuda`, `videotoolbox`, `vaapi`) by parsing `ffmpeg -hwaccels` output.
- **Trigger:** Vision Gap "GPU Acceleration" visibility. The current diagnostics miss critical information for performance tuning on GPU infrastructure.
- **Impact:** Allows users and the engine to verify GPU availability, facilitating the use of high-performance codecs like `h264_nvenc`.

## 2. File Inventory
- **Modify:** `packages/renderer/src/utils/FFmpegInspector.ts` (Implement `-hwaccels` check)
- **Modify:** `packages/renderer/tests/verify-diagnose-ffmpeg.ts` (Add verification assertions)
- **Read-Only:** `packages/renderer/src/types.ts`

## 3. Implementation Spec
- **Architecture:** Extend `FFmpegInspector.inspect` to spawn a synchronous `ffmpeg` process with the `-hwaccels` flag. Parse the output line-by-line to extract acceleration method names.
- **Pseudo-Code:**
  ```typescript
  // In FFmpegInspector.inspect:
  // 1. Spawn `ffmpeg -hwaccels`
  // 2. Parse stdout:
  //    - Skip header "Hardware acceleration methods:"
  //    - Collect non-empty lines as methods
  // 3. Add `hwaccels: string[]` to result object
  ```
- **Public API Changes:**
  - Update `FFmpegDiagnostics` interface in `FFmpegInspector.ts` to include `hwaccels: string[]`.
- **Dependencies:** None.

## 4. Test Plan
- **Verification:** Run `npx tsx packages/renderer/tests/verify-diagnose-ffmpeg.ts`.
- **Success Criteria:**
  - The script outputs the diagnostics JSON containing a `hwaccels` array.
  - The array contains strings (even if empty, it should be an array).
  - If running on a machine with GPU (e.g., Mac), it might show `videotoolbox`.
- **Edge Cases:**
  - FFmpeg version doesn't support `-hwaccels` (older versions). Handle error/empty output gracefully.
  - Output format changes.
