# Context & Goal
- **Objective**: Add orphaned verification scripts to the master test runner `run-all.ts` to ensure continuous regression testing.
- **Trigger**: Journal entry `[2026-08-08]` identifying that recent verification scripts for Playback Rate and Seek were not added to `run-all.ts`.
- **Impact**: Ensures that critical features (Audio Playback Rate, Visual Playback Rate, Audio Seek) are automatically tested in CI, preventing silent regressions.

# File Inventory
- **Modify**: `packages/renderer/tests/run-all.ts` - Add missing test paths to the `tests` array.
- **Read-Only**: `packages/renderer/tests/verify-audio-playback-rate.ts`, `packages/renderer/tests/verify-audio-playback-seek.ts`, `packages/renderer/tests/verify-visual-playback-rate.ts`

# Implementation Spec
- **Architecture**: No structural change. Configuration update to the test runner registry.
- **Pseudo-Code**:
  - OPEN `packages/renderer/tests/run-all.ts`
  - APPEND the following paths to the `tests` array:
    - `'tests/verify-audio-playback-rate.ts'`
    - `'tests/verify-audio-playback-seek.ts'`
    - `'tests/verify-visual-playback-rate.ts'`
  - SAVE file
- **Public API Changes**: None.
- **Dependencies**: None.

# Test Plan
- **Verification**: Run `npx tsx packages/renderer/tests/run-all.ts` from the package root.
- **Success Criteria**: Output confirms execution of the new tests (e.g. `✅ PASSED: tests/verify-audio-playback-rate.ts`) and final summary says "All tests passed".
- **Edge Cases**: None.
