#### 1. Context & Goal
- **Objective**: Remove `preservesPitch` from the player README.
- **Trigger**: The `preservesPitch` property is documented as part of the public API, but the underlying `Helios` core and its drivers do not actually implement pitch preservation logic. While `HeliosPlayer` has a getter and setter for it, it has no effect on actual playback. As the PLAYER planner, I cannot modify `packages/core`, so the best action is to remove the misleading documentation for now.
- **Impact**: Improves documentation accuracy by not advertising unsupported functionality.

#### 2. File Inventory
- **Create**: []
- **Modify**:
  - `packages/player/README.md`: Remove the `- \`preservesPitch\`` line from the documentation.
- **Read-Only**: `packages/core/src/drivers/DomDriver.ts`

#### 3. Implementation Spec
- **Architecture**: Simple documentation cleanup to match current reality and domain constraints.
- **Pseudo-Code**: N/A - Documentation change only.
- **Public API Changes**: `preservesPitch` property removed from the public API documentation (though the getter/setter methods remain internally).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `cat packages/player/README.md | grep preservesPitch`
- **Success Criteria**: No matches found.
- **Edge Cases**: Ensure no other surrounding list items or documentation sections are accidentally removed or malformed.
