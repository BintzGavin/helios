# 2026-06-01-CORE-Enable-Testing-Sync-Version.md

#### 1. Context & Goal
- **Objective**: Enable unit testing for `packages/core` and synchronize package version with implemented features.
- **Trigger**: `npm test -w packages/core` fails due to missing `vitest` dependency. `package.json` version (3.1.0) lags behind implemented features (v3.3.0).
- **Impact**: Ensures code quality can be verified via CI/CD and manual testing. Aligns package version with documentation.

#### 2. File Inventory
- **Modify**: `packages/core/package.json`
  - Add `vitest` to `devDependencies`.
  - Update `version` to `3.3.0`.

#### 3. Implementation Spec
- **Architecture**: Configuration update only.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/core`.
- **Success Criteria**: All unit tests pass.
