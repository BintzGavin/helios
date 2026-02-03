# Plan: Synchronize Core Version to 5.10.0

## 1. Context & Goal
- **Objective**: Update the `@helios-project/core` package version to `5.10.0` to match the documented status and released features.
- **Trigger**: The `docs/status/CORE.md` file reports the version as `5.10.0` (citing "Shared Virtual Time Binding" as the release feature), but `package.json` and `src/index.ts` are still at `5.9.0`.
- **Impact**: Ensures the build artifact reflects the correct semantic version, allowing consumers to reliably check for feature availability (`isVirtualTimeBound`). Eliminates confusion caused by version drift.

## 2. File Inventory
- **Modify**:
  - `packages/core/package.json`: Update `version` field.
  - `packages/core/src/index.ts`: Update `VERSION` constant.
  - `packages/core/src/index.test.ts`: Add verification for the `VERSION` export.

## 3. Implementation Spec
- **Architecture**: No architectural changes. Purely a metadata synchronization.
- **Changes**:
  - In `package.json`: Change `"version": "5.9.0"` to `"version": "5.10.0"`.
  - In `src/index.ts`: Change `export const VERSION = '5.9.0';` to `export const VERSION = '5.10.0';`.
  - In `src/index.test.ts`: Add a test case `it('should export correct version')` that asserts `VERSION` equals `'5.10.0'`.

## 4. Test Plan
- **Verification**: Run unit tests for the core package.
  ```bash
  npm test -w packages/core
  ```
- **Success Criteria**:
  - All tests pass (including existing logic).
  - The new version check passes.
- **Edge Cases**:
  - Verify that `npm test` doesn't fail due to workspace dependency warnings (though resolving them is outside Core's scope).
