# 2026-08-26-DEMO-Fix-Root-Build.md

#### 1. Context & Goal
- **Objective**: Fix the `npm install` failure at the root caused by version mismatches between the `@helios-project/core` workspace (`5.10.0`) and consumers like `@helios-project/studio` (requiring `^5.4.0`) and `@helios-project/renderer`.
- **Trigger**: The status file (`docs/status/DEMO.md`) reports "Root Build Dependency Mismatch" as a blocked item preventing clean builds.
- **Impact**: Unblocks CI, local development, and the ability to verify examples and run E2E tests.

#### 2. File Inventory
- **Modify**: `package.json` (Root) - Add `overrides` configuration.
- **Read-Only**: `packages/core/package.json` (to confirm version).

#### 3. Implementation Spec
- **Architecture**: Use NPM `overrides` (available in NPM 8+) to force all workspace consumers to use the specific local workspace version of `@helios-project/core`.
- **Changes**:
  - Add `"overrides"` section to root `package.json` (or append if exists):
    ```json
    "overrides": {
      "@helios-project/core": "5.10.0"
    }
    ```

#### 4. Test Plan
- **Verification**:
  1. Run `npm install` at the root.
  2. Verify that it completes without error.
  3. Run `npm run build:examples` to confirm that the build pipeline is unblocked and can resolve `core` correctly.
- **Success Criteria**: `npm install` exits with code 0.
- **Edge Cases**: Ensure that `packages/cli` (which depends on `renderer`) also resolves correctly.
- **Pre-Commit**: Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
