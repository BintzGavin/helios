# Plan: Synchronize Version and Document Input Schema

#### 1. Context & Goal
- **Objective**: Synchronize the `packages/core` version to `5.11.0` to match the status file and document the Input Schema feature in `README.md`.
- **Trigger**: Discrepancy between `package.json` (`5.10.0`) and `docs/status/CORE.md` (`5.11.0`), and missing documentation for the existing Input Schema feature.
- **Impact**: Ensures package versioning is consistent with the reported status and provides users with critical documentation on how to use the Input Schema for property validation, a key feature of the "Headless State Machine".

#### 2. File Inventory
- **Modify**: `packages/core/package.json`
  - Update `version` to `5.11.0`.
- **Modify**: `packages/core/src/index.ts`
  - Update `VERSION` constant to `5.11.0`.
- **Modify**: `packages/core/README.md`
  - Add a new section "Input Schema" demonstrating how to define a schema and validate props.

#### 3. Implementation Spec
- **Architecture**: No architectural changes. Purely documentation and metadata update.
- **Pseudo-Code**: N/A (Documentation)
- **Public API Changes**: None (Version bump only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/core` to ensure no regressions.
- **Success Criteria**:
  - `package.json` version is `5.11.0`.
  - `VERSION` export is `5.11.0`.
  - `README.md` contains clear examples of Input Schema usage.
- **Edge Cases**: Ensure `npm install` does not fail due to version conflicts in workspace (though this plan does not modify other packages, the executor should be aware).
