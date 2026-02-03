# Context & Goal
- **Objective**: Add orphaned verification scripts to the master test runner to ensure continuous regression testing.
- **Trigger**: Journal entry `[2026-08-08]` identifying that recent verification scripts were not added to `run-all.ts`.
- **Impact**: Ensures that critical features (Audio Playback Rate, Visual Playback Rate, Audio Seek) are automatically tested in CI, preventing silent regressions.

# File Inventory
- **Modify**: `packages/renderer/tests/run-all.ts` (Add missing test files to the `tests` array)

# Implementation Spec
- **Architecture**: No structural change, just configuration update.
- **Pseudo-Code**:
  ```typescript
  // In packages/renderer/tests/run-all.ts
  const tests = [
    // ... existing tests ...
    'tests/verify-audio-playback-rate.ts',
    'tests/verify-audio-playback-seek.ts',
    'tests/verify-visual-playback-rate.ts',
  ];
  ```

# Test Plan
- **Verification**: `npm test` (inside `packages/renderer`)
- **Success Criteria**: The output shows "Running: tests/verify-audio-playback-rate.ts", etc., and "SUMMARY: All tests passed."
- **Edge Cases**: Ensure paths are correct relative to package root.
