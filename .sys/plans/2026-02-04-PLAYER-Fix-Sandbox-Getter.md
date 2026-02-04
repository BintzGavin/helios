# 2026-02-04-PLAYER-Fix-Sandbox-Getter

#### 1. Context & Goal
- **Objective**: Fix the `sandbox` property getter in `HeliosPlayer` to correctly return empty string (`""`) when strict sandboxing is enabled.
- **Trigger**: The current implementation incorrectly returns the default value (`"allow-scripts allow-same-origin"`) when the attribute is set to `""`, masking the actual strict state. This was identified as a critical learning in `.jules/PLAYER.md`.
- **Impact**: Ensures the `player.sandbox` property accurately reflects the DOM attribute state, allowing developers to verify strict sandboxing programmatically.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Update `sandbox` getter logic)
- **Modify**: `packages/player/src/sandbox.test.ts` (Add test case for property getter)
- **Read-Only**: `packages/player/src/controllers.ts`

#### 3. Implementation Spec
- **Architecture**: Update the getter to explicitly check for `null` from `getAttribute()` instead of using the `||` operator which treats empty string as falsy.
- **Pseudo-Code**:
  ```typescript
  get sandbox() {
    const val = this.getAttribute("sandbox");
    // Return value if not null (even if empty string), otherwise default
    return val !== null ? val : "allow-scripts allow-same-origin";
  }
  ```
- **Public API Changes**: None (Behavior fix only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test packages/player/src/sandbox.test.ts`
- **Success Criteria**:
  - New test case passes: `player.sandbox` returns `""` when attribute is `""`.
  - Existing tests pass.
- **Edge Cases**:
  - `sandbox` attribute removed -> returns default.
  - `sandbox` attribute set to "allow-scripts" -> returns "allow-scripts".
