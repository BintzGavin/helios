#### 1. Context & Goal
- **Objective**: Improve test coverage for the `disconnectedCallback` teardown logic in `HeliosPlayer`.
- **Trigger**: The PLAYER domain is in gravitational equilibrium with the vision. Fallback protocol dictates improving test coverage when no feature gaps exist. Exploration confirmed missing tests for `disconnectedCallback`.
- **Impact**: Increases robustness and ensures no memory leaks occur when the component is unmounted by verifying event listeners are removed.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/src/index.test.ts` to add test cases verifying `disconnectedCallback` successfully removes window and document event listeners.
- **Read-Only**: `packages/player/src/index.ts`

#### 3. Implementation Spec
- **Architecture**: Standard Vitest testing using JSDOM.
- **Pseudo-Code**:
  - Mount `<helios-player>` and spy on `window.removeEventListener` and `document.removeEventListener`.
  - Call `disconnectedCallback()` on the player instance.
  - Assert that `removeEventListener` was called for `message` on `window` and `fullscreenchange` on `document`.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**: All tests pass, ensuring the teardown lifecycle is correctly executed.
- **Edge Cases**: N/A
