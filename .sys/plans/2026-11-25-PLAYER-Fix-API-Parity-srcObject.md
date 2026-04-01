#### 1. Context & Goal
- **Objective**: Fix `srcObject` getter/setter to store the assigned value internally.
- **Trigger**: The current implementation of `srcObject` only returns null, violating HTMLMediaElement parity expectations where assigned properties should be readable.
- **Impact**: Improves compatibility with third-party wrappers that expect `srcObject` to persist values.

#### 2. File Inventory
- **Create**: []
- **Modify**: [`packages/player/src/index.ts`, `packages/player/src/api_parity.test.ts`]
- **Read-Only**: [`packages/player/README.md`]

#### 3. Implementation Spec
- **Architecture**: Update `srcObject` getter and setter to store the value internally instead of just returning null and warning.
- **Pseudo-Code**:
  - Add private `_srcObject: MediaProvider | null = null;` to `HeliosPlayer`.
  - Update `get srcObject()` to return `this._srcObject`.
  - Update `set srcObject(val)` to `this._srcObject = val; console.warn("HeliosPlayer does not currently render srcObject streams, but value is stored.");`
- **Public API Changes**: `HeliosPlayer.srcObject` will now correctly reflect assigned values.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**: The `api_parity.test.ts` test for `srcObject` passes, verifying that getting the property returns the set value, and a console warning is emitted.
- **Edge Cases**: Verify setting to null works correctly.
