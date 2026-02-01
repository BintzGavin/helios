# CORE: Remove Deprecated WaapiDriver

## 1. Context & Goal
- **Objective**: Remove the deprecated `WaapiDriver` class and its exports to clean up technical debt.
- **Trigger**: Maintenance; `WaapiDriver` has been deprecated since v1.12.0 and is fully superseded by `DomDriver`.
- **Impact**: Breaking change for any external consumers explicitly importing `WaapiDriver`. Internal code uses `DomDriver`. Reduces bundle size and API surface area.

## 2. File Inventory
- **Delete**: `packages/core/src/drivers/WaapiDriver.ts` (Deprecated driver implementation)
- **Modify**: `packages/core/src/drivers/index.ts` (Remove export)
- **Modify**: `packages/core/src/index.ts` (Update VERSION constant)
- **Modify**: `packages/core/package.json` (Update version field)
- **Read-Only**: `packages/core/src/Helios.ts` (Verify no usage)

## 3. Implementation Spec
- **Architecture**: Removal of dead code. No architectural change.
- **Pseudo-Code**:
  - Delete `packages/core/src/drivers/WaapiDriver.ts`.
  - In `packages/core/src/drivers/index.ts`, remove `export * from './WaapiDriver.js';`.
  - In `packages/core/package.json`, update `"version": "3.9.2"` to `"version": "3.9.3"`.
  - In `packages/core/src/index.ts`, update `VERSION` constant to `'3.9.3'`.
- **Public API Changes**: `WaapiDriver` is no longer exported.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**: All tests pass. Build succeeds (`npm run build`).
- **Edge Cases**: Verify that `DomDriver` logic (which covers WAAPI) is still intact (covered by existing `DomDriver.test.ts`).
