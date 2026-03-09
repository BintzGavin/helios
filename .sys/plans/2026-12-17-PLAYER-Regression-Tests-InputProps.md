#### 1. Context & Goal
- **Objective**: Improve the `<helios-player>` Web Component by adding comprehensive regression tests for `input-props` JSON parsing edge cases.
- **Trigger**: The PLAYER domain has reached gravitational equilibrium with the documented vision. Falling back to regression tests to maintain stability.
- **Impact**: Enhances the overall robustness of the `input-props` attribute handling and ensures edge cases (like null or empty string updates) don't cause uncaught exceptions or warnings, validating the resilience of `HeliosPlayer`.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/src/index.test.ts`
- **Read-Only**: `README.md`, `packages/player/src/index.ts`

#### 3. Implementation Spec
- **Architecture**: Expand the existing Vitest suite in `index.test.ts`. Focus on testing the edge cases of the `attributeChangedCallback` specifically for the `input-props` attribute.
- **Pseudo-Code**:
  - In `index.test.ts`: Find the `describe('input-props')` block.
  - Add a test verifying `input-props` parses explicit `"null"` string successfully without throwing.
  - Add a test verifying `input-props` gracefully handles empty string `""` by either throwing a handled warning or avoiding parsing altogether.
  - Verify that when valid properties are parsed, they correctly update `this.pendingProps` and call `controller.setInputProps()`.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `cd packages/player && npm install --no-save --workspaces=false && npm run test`
- **Success Criteria**: All tests run successfully.
- **Edge Cases**: Ensure the test successfully mocks `console.warn` to assert on its behavior without cluttering the test output.
