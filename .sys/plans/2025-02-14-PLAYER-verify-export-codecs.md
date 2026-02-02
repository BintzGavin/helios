# 1. Context & Goal
- **Objective**: Enhance `ClientSideExporter` to verify codec support (H.264/VP9/AAC/Opus) via `HeliosController.diagnose()` before starting export, preventing runtime failures.
- **Trigger**: Current implementation blindly assumes codec availability, which can fail on certain OS/Browser combinations (e.g. Firefox on Linux, or stripped-down environments).
- **Impact**: Improves UX by providing clear, actionable error messages ("Browser does not support WebM export") instead of generic failures, and hardening the "Agent Experience" for automated tasks.

# 2. File Inventory
- **Modify**: `packages/player/src/features/exporter.ts` (Implement check logic)
- **Modify**: `packages/player/src/features/exporter.test.ts` (Add test cases)
- **Read-Only**: `packages/player/src/controllers.ts` (Interface reference)

# 3. Implementation Spec
- **Architecture**: Use the existing `diagnose()` method on `HeliosController`.
- **Pseudo-Code**:
  ```typescript
  // In export() method

  // 0. Verify Codec Support
  let report: DiagnosticReport | null = null;
  try {
      report = await this.controller.diagnose();
  } catch (e) {
      console.warn("Diagnostics check failed, proceeding with export risks.", e);
  }

  if (report) {
      // Check Video Codecs
      if (format === 'mp4' && !report.videoCodecs.h264) {
           throw new Error("Browser does not support H.264 encoding (MP4).");
      }
      if (format === 'webm' && !report.videoCodecs.vp9) {
           throw new Error("Browser does not support VP9 encoding (WebM).");
      }
  }

  // ... existing logic ...

  // 5. Setup Audio Track
  // ...
  if (audioTracks.length > 0) {
      if (report) {
          if (format === 'mp4' && !report.audioCodecs.aac) {
               throw new Error("Browser does not support AAC encoding.");
          }
          if (format === 'webm' && !report.audioCodecs.opus) {
               throw new Error("Browser does not support Opus encoding.");
          }
      }
      // ...
  }
  ```
- **Dependencies**: None.

# 4. Test Plan
- **Verification**: Run `npm test -w packages/player`
- **Success Criteria**:
  - New test case `should throw error if video codec is not supported` passes.
  - New test case `should throw error if audio codec is not supported` passes.
  - Existing tests pass (regression check).
- **Edge Cases**:
  - `diagnose()` failing/timing out should not block export (warn only).
  - Empty audio tracks should skip audio codec check.
