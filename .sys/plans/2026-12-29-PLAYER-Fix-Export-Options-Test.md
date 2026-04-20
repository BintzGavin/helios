#### 1. Context & Goal
- **Objective**: Fix the `export-options.test.ts` failure caused by the `document is not defined` error when evaluating the module containing `<helios-player>`.
- **Trigger**: Test suite for `packages/player` fails because `document` is used at the top-level of `index.ts` before JSDOM is initialized in the test environment.
- **Impact**: Enables the test suite to run and allows us to verify new changes in the player components.

#### 2. File Inventory
- **Create**: none
- **Modify**: `packages/player/src/export-options.test.ts`
- **Read-Only**: `packages/player/src/index.ts`

#### 3. Implementation Spec
- **Architecture**: The `vitest` environment defaults to Node.js, meaning `document` is not available by default. We need to add the `@vitest-environment jsdom` pragma to the top of `export-options.test.ts` to instruct Vitest to set up JSDOM before executing the file.
- **Pseudo-Code**:
  - Add `// @vitest-environment jsdom` to the first line of `packages/player/src/export-options.test.ts`.
- **Public API Changes**: none
- **Dependencies**: none

#### 4. Test Plan
- **Verification**: Run `npx vitest run packages/player/src/export-options.test.ts` to verify the test passes.
- **Success Criteria**: The test executes successfully without throwing `ReferenceError: document is not defined`.
- **Edge Cases**: none
