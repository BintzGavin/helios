#### 1. Context & Goal
- **Objective**: Synchronize `packages/core` version to 2.9.0.
- **Trigger**: `docs/status/CORE.md` indicates v2.9.0 is released, but `package.json` is still at 2.8.0.
- **Impact**: Resolves version mismatch and ensures downstream packages can depend on v2.9.0 features (Recursive Schema).

#### 2. File Inventory
- **Modify**: `packages/core/package.json` (Update version field)

#### 3. Implementation Spec
- **Architecture**: Metadata update only.
- **Pseudo-Code**: Change "version": "2.8.0" to "2.9.0" in `packages/core/package.json`.
- **Public API Changes**: None (Version bump).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `grep "\"version\": \"2.9.0\"" packages/core/package.json`
- **Success Criteria**: Output shows "version": "2.9.0".
- **Edge Cases**: None.
