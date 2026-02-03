# Context & Goal
- **Objective**: Synchronize `@helios-project/core` dependency to version `5.9.0` to match the local workspace version.
- **Trigger**: Discrepancy between `packages/renderer/package.json` (5.5.0) and workspace root (5.9.0), causing potential local development friction and type mismatches.
- **Impact**: Ensures that the renderer consumes the latest stable core features (e.g., Shared Virtual Time) and tests run correctly in the monorepo environment.

# File Inventory
- **Modify**: `packages/renderer/package.json`
- **Read-Only**: `packages/core/package.json` (reference)

# Implementation Spec
- **Architecture**: Minimal configuration update. No code changes expected unless breaking changes in Core affect Renderer types (unlikely given SemVer, but will verify).
- **Pseudo-Code**:
  - OPEN `packages/renderer/package.json`
  - SET `dependencies["@helios-project/core"]` to `"5.9.0"`
  - SAVE file
- **Public API Changes**: None.
- **Dependencies**: `@helios-project/core` (update only).

# Test Plan
- **Verification**:
  - Run `npm install` in `packages/renderer` to ensure resolution works.
  - Run `npm test` to execute the full verification suite.
- **Success Criteria**:
  - `npm install` succeeds.
  - All tests in `run-all.ts` pass (Exit Code: 0).
- **Edge Cases**:
  - If Core `5.9.0` introduced breaking changes affecting `Renderer`, tests will fail. I will diagnose and fix if necessary (though outside strict scope, it's required for green build).
