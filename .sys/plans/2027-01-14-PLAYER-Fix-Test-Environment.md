#### 1. Context & Goal
- **Objective**: Fix the `document is not defined` and `window is not defined` errors in the Vitest test suite.
- **Trigger**: `vitest run` fails for `audio-fader.test.ts`, `exporter.test.ts`, `video-volume.test.ts`, and `audio-context-manager.test.ts` due to missing `jsdom` environment.
- **Impact**: Restores full test suite passing status, which is critical for verifying future changes and proving the stability of the `packages/player` domain.

#### 2. File Inventory
- **Create**: [None]
- **Modify**:
  - `packages/player/src/features/audio-fader.test.ts` (Add `// @vitest-environment jsdom`)
  - `packages/player/src/features/exporter.test.ts` (Add `// @vitest-environment jsdom`)
  - `packages/player/src/features/video-volume.test.ts` (Add `// @vitest-environment jsdom`)
  - `packages/player/src/features/audio-context-manager.test.ts` (Add `// @vitest-environment jsdom`)
- **Read-Only**: `packages/player/vitest.config.ts`

#### 3. Implementation Spec
- **Architecture**: Ensure that test files requiring DOM APIs (`window`, `document`) have the correct Vitest environment explicitly declared at the top of the file. Although `vitest.config.ts` declares `jsdom`, sometimes individual files need the explicit pragma to force the environment depending on the vitest resolution logic or monorepo setup.
- **Pseudo-Code**: Prepend `// @vitest-environment jsdom` to the top of the failing test files.
- **Public API Changes**: None.
- **Dependencies**: [None]

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**: All tests pass successfully without `document is not defined` or `window is not defined` errors.
- **Edge Cases**: Ensure no syntax errors are introduced by adding the pragma.
