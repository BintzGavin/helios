# 2026-09-13-RENDERER-FFmpeg-Hardware-Acceleration.md

#### 1. Context & Goal
- **Objective**: Enhance `FFmpegInspector` to detect supported hardware acceleration methods (e.g., `cuda`, `videotoolbox`, `vaapi`) available in the FFmpeg build.
- **Trigger**: Vision gap identified in `docs/status/RENDERER.md`. The "Diagnostics" feature currently misses hardware acceleration capabilities, leaving users blind to GPU availability.
- **Impact**: Provides critical visibility into the rendering environment, enabling better debugging of performance issues and validation of GPU-accelerated workflows in distributed systems.

#### 2. File Inventory
- **Create**: None.
- **Modify**:
  - `packages/renderer/src/utils/FFmpegInspector.ts`: Add `hwaccels` detection logic.
  - `packages/renderer/tests/verify-diagnose-ffmpeg.ts`: Update test to verify `hwaccels` presence.
- **Read-Only**:
  - `packages/renderer/src/Renderer.ts` (Reference for usage)

#### 3. Implementation Spec
- **Architecture**: Extend the existing `FFmpegInspector` static class to spawn `ffmpeg -hwaccels` and parse the output.
- **Public API Changes**:
  - Update `FFmpegDiagnostics` interface:
    ```typescript
    export interface FFmpegDiagnostics {
      // ... existing fields
      hwaccels: string[];
    }
    ```
- **Logic Flow**:
  1. In `FFmpegInspector.inspect(ffmpegPath)`:
  2. Spawn `ffmpeg -hwaccels`.
  3. Capture stdout.
  4. Parse output: The output typically lists one accelerator per line after a header.
     - Example output:
       ```
       Hardware acceleration methods:
       cuda
       dxva2
       qsv
       d3d11va
       ```
  5. Extract the list of accelerators (skipping the header).
  6. Add to the `result` object.

#### 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-diagnose-ffmpeg.ts`
- **Success Criteria**:
  - The script outputs the diagnostics JSON including `"hwaccels": [...]`.
  - The script asserts that `diagnostics.ffmpeg.hwaccels` is an array.
  - The script passes without error.
- **Edge Cases**:
  - FFmpeg version without `-hwaccels` support (unlikely in modern builds, but should handle gracefully/empty array).
  - Empty output from command.
