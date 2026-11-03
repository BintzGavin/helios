#### 1. Context & Goal
- **Objective**: Document the `webkitAudioDecodedByteCount`, `webkitDecodedFrameCount`, `webkitDroppedFrameCount`, and `webkitVideoDecodedByteCount` properties in the README.
- **Trigger**: Vision gap: These properties were recently implemented in the `HeliosPlayer` (v0.79.23) to achieve HTMLVideoElement API parity, but are missing from the `README.md` documentation.
- **Impact**: Ensures the documentation accurately reflects the implemented standard media API parity.

#### 2. File Inventory
- **Create**: none
- **Modify**: `packages/player/README.md` (Add the missing webkit properties to the `Properties` list)
- **Read-Only**: `packages/player/src/index.ts` (To verify implementation)

#### 3. Implementation Spec
- **Architecture**: Documentation update in the README.
- **Pseudo-Code**:
  Add the following items to the `### Properties` section in `packages/player/README.md` (likely at the end of the standard `HTMLVideoElement` properties):
  - `webkitAudioDecodedByteCount` (number, read-only): Returns 0 (API parity mock).
  - `webkitDecodedFrameCount` (number, read-only): Returns 0 (API parity mock).
  - `webkitDroppedFrameCount` (number, read-only): Returns 0 (API parity mock).
  - `webkitVideoDecodedByteCount` (number, read-only): Returns 0 (API parity mock).
- **Public API Changes**: None (documentation only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `grep -rn "webkitDecodedFrameCount" packages/player/README.md`
- **Success Criteria**: The `grep` command should output the lines containing the newly added properties, verifying they were added to the README.
- **Edge Cases**: Ensure alphabetical or logical placement within the Properties section.
