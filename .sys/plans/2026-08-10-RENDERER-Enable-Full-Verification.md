#### 1. Context & Goal
- **Objective**: Enable orphaned verification tests for playback rate and audio seeking, and synchronize workspace dependencies to allow local execution.
- **Trigger**: Discovery that `verify-audio-playback-rate.ts`, `verify-audio-playback-seek.ts`, and `verify-visual-playback-rate.ts` are present but excluded from the master test runner `run-all.ts`.
- **Impact**: Ensures continuous regression testing for recently implemented features (visual playback rate, audio seeking, audio rate). Unblocks local development by fixing dependency version mismatch.

#### 2. File Inventory
- **Create**: (None)
- **Modify**:
  - `packages/renderer/package.json`: Update `@helios-project/core` dependency version.
  - `packages/renderer/tests/run-all.ts`: Add orphaned test files to the execution list.
- **Read-Only**:
  - `packages/renderer/tests/verify-audio-playback-rate.ts`
  - `packages/renderer/tests/verify-audio-playback-seek.ts`
  - `packages/renderer/tests/verify-visual-playback-rate.ts`

#### 3. Implementation Spec
- **Architecture**:
  - **Dependency Sync**: Update `package.json` to match the monorepo workspace version for `@helios-project/core` (5.8.0), enabling successful `npm install` and module resolution.
  - **Test Registry**: Register the missing verification scripts in `run-all.ts` to ensure they are executed by the `npm test` command.
- **Pseudo-Code**:
  - **package.json**:
    - SET dependencies["@helios-project/core"] = "5.8.0"
  - **run-all.ts**:
    - APPEND "tests/verify-audio-playback-rate.ts" TO tests array
    - APPEND "tests/verify-audio-playback-seek.ts" TO tests array
    - APPEND "tests/verify-visual-playback-rate.ts" TO tests array
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm install` in `packages/renderer/`.
  - Run `npm test` (which executes `npx tsx tests/run-all.ts`).
- **Success Criteria**:
  - `npm install` completes without error (resolving local workspace package).
  - Output shows "Running: tests/verify-audio-playback-rate.ts" (and others).
  - All tests pass (Exit Code: 0).
- **Edge Cases**:
  - If tests fail, they must be fixed or temporarily disabled with a TODO, but the goal is to enable them.
