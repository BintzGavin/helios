# 1. Context & Goal
- **Objective**: Update the verification runner to include four missing tests: Blob Audio, Frame Count, Shadow DOM Images, and DOM Audio Fades.
- **Trigger**: Journal entry identifying a gap where CI skips valid verification scripts (`[2025-05-22] - Verification Gap in Run-All Script`).
- **Impact**: Ensures "Recent Wins" (Blob audio extraction, precision frame counting, deep Shadow DOM preloading) remain verified and prevents regressions in critical rendering paths.

# 2. File Inventory
- **Create**: None
- **Modify**: `packages/renderer/tests/run-all.ts` (Add missing test file paths to the `tests` array)
- **Read-Only**: `packages/renderer/tests/verify-blob-audio.ts`, `packages/renderer/tests/verify-frame-count.ts`, `packages/renderer/tests/verify-shadow-dom-images.ts`, `packages/renderer/tests/verify-dom-audio-fades.ts`

# 3. Implementation Spec
- **Architecture**: No architectural changes. Configuration update only.
- **Pseudo-Code**:
  - OPEN `packages/renderer/tests/run-all.ts`
  - LOCATE the `tests` array variable
  - APPEND the string `'tests/verify-blob-audio.ts'`
  - APPEND the string `'tests/verify-frame-count.ts'`
  - APPEND the string `'tests/verify-shadow-dom-images.ts'`
  - APPEND the string `'tests/verify-dom-audio-fades.ts'`
  - SAVE file
- **Public API Changes**: None
- **Dependencies**: None

# 4. Test Plan
- **Verification**: `npm test -w packages/renderer`
- **Success Criteria**: Output must confirm all tests passed (including the 4 new ones).
- **Edge Cases**:
  - `verify-shadow-dom-images.ts` uses request interception; ensure it doesn't fail on restricted networks.
  - `verify-blob-audio.ts` creates temp files; ensure cleanup works.
