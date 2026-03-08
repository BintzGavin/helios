#### 1. Context & Goal
- **Objective**: Implement comprehensive regression tests for the `<helios-player>` Web Component focusing on edge-cases for bridge communication and media property persistence.
- **Trigger**: The PLAYER domain has reached gravitational equilibrium with the documented vision. Falling back to regression tests to maintain stability.
- **Impact**: Enhances the overall robustness of the interactive bridge mechanism, ensuring `HTMLMediaElement` property parity (e.g. videoWidth/Height updates) is stable when cross-origin iframes connect.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/src/bridge_capture.test.ts`, `packages/player/src/bridge.test.ts`
- **Read-Only**: `README.md`, `AGENTS.md`, `packages/player/src/index.ts`, `packages/player/src/bridge.ts`

#### 3. Implementation Spec
- **Architecture**: Expand the existing Vitest suites in `bridge.test.ts` and `bridge_capture.test.ts`. Focus on mocking the `postMessage` protocol realistically to simulate deferred loading, message interleaving, and cross-origin security checks.
- **Pseudo-Code**:
  - In `bridge.test.ts`: Add test cases verifying that `event.source` checks correctly reject messages from untrusted or deeply nested iframes.
  - In `bridge_capture.test.ts`: Add test cases verifying that when `videoWidth` and `videoHeight` are updated on the host state, those updates accurately reflect via getters on the player instance.
  - Verify that property changes occurring *while* the iframe is loading are queued or persisted until `HELIOS_READY` is received.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**: All newly added test cases in `bridge.test.ts` and `bridge_capture.test.ts` pass, alongside the rest of the Vitest suite.
- **Edge Cases**: Ensure simulated delays in `postMessage` are handled without causing race conditions in the tests.
