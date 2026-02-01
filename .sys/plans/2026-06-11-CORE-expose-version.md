# Context & Goal
- **Objective**: Expose the package version as a runtime constant and verify robust initialization of `bindToDocumentTimeline` with pre-existing virtual time.
- **Trigger**: Backlog item "Fix GSAP Timeline Synchronization" implies potential race conditions during initialization where `window.__HELIOS_VIRTUAL_TIME__` might be set before `Helios` is instantiated. Additionally, `package.json` version (3.6.0) has drifted from documentation (3.8.0).
- **Impact**: Enables runtime version compatibility checks (hardening protocol boundaries) and ensures `Helios` correctly syncs with the environment even if the driver script executes before the application logic.

# File Inventory
- **Modify**: `packages/core/src/index.ts` (Export `VERSION`)
- **Modify**: `packages/core/src/index.test.ts` (Add test case for pre-existing virtual time)
- **Modify**: `packages/core/package.json` (Bump version to 3.8.1)

# Implementation Spec
- **Architecture**:
  - Add a named export `VERSION` to `packages/core/src/index.ts` matching the `package.json` version.
  - In `index.test.ts`, verify that `bindToDocumentTimeline` correctly picks up `window.__HELIOS_VIRTUAL_TIME__` if it was assigned *before* the method was called.
- **Pseudo-Code**:
  - `packages/core/src/index.ts`: `export const VERSION = '3.8.1';`
  - `packages/core/package.json`: Update `"version": "3.8.1"`.
  - `packages/core/src/index.test.ts`: Add `it('should sync with pre-existing __HELIOS_VIRTUAL_TIME__ on bind')` that sets `window.__HELIOS_VIRTUAL_TIME__` before `bindToDocumentTimeline()` and asserts `currentFrame` matches immediately.
- **Public API Changes**:
  - New export: `VERSION` (string).
- **Dependencies**: None.

# Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `packages/core` tests pass (specifically the new test case).
  - `import { VERSION } from '@helios-project/core'` returns `'3.8.1'`.
  - `package.json` version is `'3.8.1'`.
- **Edge Cases**:
  - Pre-existing virtual time is `0` (should work).
  - Pre-existing virtual time is `NaN` (should be ignored by setter logic, verified by existing logic but good to keep in mind).
