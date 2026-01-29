# 2026-01-29-CORE-Maintenance.md

#### 1. Context & Goal
- **Objective**: Synchronize `packages/core/package.json` version with implemented features (v2.7.0), correct the license in `packages/core/README.md` to match the project's ELv2, and rename `audio.test.ts` to reflect its scope.
- **Trigger**: Discrepancy between `docs/status/CORE.md` (v2.7.0), `package.json` (v2.6.1), and `README.md` (MIT License).
- **Impact**: Ensures legal compliance, package integrity, and reduces developer confusion regarding the missing `audio.ts` file.

#### 2. File Inventory
- **Modify**: `packages/core/package.json` (Bump version to 2.7.0)
- **Modify**: `packages/core/README.md` (Update License to ELv2)
- **Rename**: `packages/core/src/audio.test.ts` -> `packages/core/src/helios-audio.test.ts`

#### 3. Implementation Spec
- **Version Update**: Update `version` field in `packages/core/package.json` from `2.6.1` to `2.7.0`.
- **License Fix**: Update "License" section in `packages/core/README.md` to state "Elastic License 2.0 (ELv2)" instead of "MIT".
- **Test Rename**: Rename `packages/core/src/audio.test.ts` to `packages/core/src/helios-audio.test.ts` to clarify it tests the `Helios` class audio signals, not a standalone `audio` module.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**: All tests pass, including the renamed test file.
- **Verification**: `list_files packages/core/src`
    - Check that `helios-audio.test.ts` exists and `audio.test.ts` is gone.
- **Verification**: `read_file packages/core/package.json`
    - Check for `"version": "2.7.0"`.
- **Verification**: `read_file packages/core/README.md`
    - Check for "Elastic License 2.0 (ELv2)".
