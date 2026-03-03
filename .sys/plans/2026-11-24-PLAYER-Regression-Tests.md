#### 1. Context & Goal
- **Objective**: Implement comprehensive regression tests for the `<helios-player>` Web Component to ensure long-term stability.
- **Trigger**: The PLAYER domain has reached gravitational equilibrium with the documented vision. Falling back to regression tests to maintain stability.
- **Impact**: This unlocks greater confidence in the core player functionality and prevents future regressions as other domains (like STUDIO and CLI) continue to expand.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/src/features/api_parity.test.ts`, `packages/player/src/features/interaction.test.ts`
- **Read-Only**: `README.md`, `AGENTS.md`, `packages/player/src/index.ts`

#### 3. Implementation Spec
- **Architecture**: Expand the existing Vitest suite. Focus on testing the edge cases of the Standard Media API (`HTMLMediaElement` parity) and interactive UI components (like the new Settings and Export menus).
- **Pseudo-Code**:
  - Add test cases verifying that `seeking` is correctly flipped during asynchronous seek operations.
  - Add test cases verifying that `volume` and `muted` state persistence works across iframe reloads.
  - Add test cases for the Export Menu interactions (ensuring correct parameters are passed to `ClientSideExporter`).
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**: All tests pass, including the newly added regression test suites.
- **Edge Cases**: Ensure tests correctly handle the asynchronous nature of the `postMessage` bridge.
