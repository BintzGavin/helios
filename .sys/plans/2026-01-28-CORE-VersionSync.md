# 1. Context & Goal
- **Objective**: Synchronize `packages/core/package.json` version and metadata with the project status, and correct the license in `packages/core/README.md`.
- **Trigger**: `docs/status/CORE.md` lists version 2.2.0, but `packages/core/package.json` is 0.0.1. `packages/core/README.md` incorrectly lists "MIT" license instead of "Elastic License 2.0".
- **Impact**: Ensures package maturity is correctly reflected for consumers, fixes legal discrepancy, and improves tooling support via modern exports.

# 2. File Inventory
- **Modify**:
  - `packages/core/package.json`: Update version, improve exports.
  - `packages/core/README.md`: Update license to ELv2.

# 3. Implementation Spec
- **Package.json Updates**:
  - Change `version` to `2.2.0`.
  - Update `exports` field to:
    ```json
    "exports": {
      ".": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      }
    }
    ```
  - Ensure `license` field matches (it is already ELv2 in package.json).
- **README Updates**:
  - Find the "License" section in `packages/core/README.md`.
  - Replace "MIT" with "Elastic License 2.0 (ELv2)".

# 4. Test Plan
- **Verification**:
  - Run `grep "version" packages/core/package.json` to verify version is `2.2.0`.
  - Run `grep "License" packages/core/README.md` to verify license is `Elastic License 2.0 (ELv2)`.
  - Run `npm test -w packages/core` to ensure the package configuration is valid and tests pass.
- **Success Criteria**:
  - Version is updated.
  - License is correct.
  - Tests pass.
