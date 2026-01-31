# Plan: Synchronize Core Version to 3.1.0

## 1. Context & Goal
- **Objective**: Synchronize `packages/core/package.json` version to `3.1.0` to match the documented status and implemented features.
- **Trigger**: Audit revealed version drift: `package.json` is at `2.19.0` while `docs/status/CORE.md` and codebase reflect `v3.1.0` (Schema UI Constraints, ReadonlySignal).
- **Impact**: Ensures SemVer compliance, prevents ecosystem breakage, and accurately reflects the library's capabilities for consumers.

## 2. File Inventory
- **Modify**:
  - `packages/core/package.json`: Update version to `3.1.0`.
- **Read-Only**:
  - `docs/status/CORE.md`: Source of truth for version number.
  - `packages/core/src/index.ts`: Verification of features.

## 3. Implementation Spec
- **Architecture**: No architectural changes. Metadata update only.
- **Pseudo-Code**:
  ```json
  // packages/core/package.json
  {
    "version": "3.1.0",
    // ...
  }
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  - Run `npm test -w packages/core` to ensure the package is stable.
  - Check `package.json` content to confirm version update.
- **Success Criteria**: `npm test` passes and `package.json` shows `"version": "3.1.0"`.
- **Edge Cases**: None.
