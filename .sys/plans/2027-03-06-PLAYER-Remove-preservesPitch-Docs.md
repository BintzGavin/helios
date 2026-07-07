#### 1. Context & Goal
- **Objective**: Remove the `preservesPitch` property documentation from the project README.
- **Trigger**: Discovered that while `preservesPitch` is exposed in `HeliosPlayer`, it lacks the required underlying architectural support in `packages/core/src/drivers/DomDriver.ts` to function properly, causing a vision gap.
- **Impact**: Prevents misleading users about unsupported playback rate features until core support can be prioritized.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/README.md` (Remove `preservesPitch` from the properties list)
- **Read-Only**: `packages/player/src/index.ts` (To confirm `preservesPitch` exists but shouldn't be documented yet)

#### 3. Implementation Spec
- **Architecture**: Documentation correction. No code changes are required for this task in the player domain as the property will remain hidden until core supports it.
- **Pseudo-Code**:
  - Open `packages/player/README.md`
  - Locate the line `- \`preservesPitch\` (boolean): Whether pitch should be preserved when altering playback speed.`
  - Delete this line.
- **Public API Changes**: `preservesPitch` is removed from public documentation.
- **Dependencies**: None. (A future CORE task will be needed to actually implement the feature)

#### 4. Test Plan
- **Verification**: `grep "preservesPitch" packages/player/README.md`
- **Success Criteria**: The grep command returns no results, confirming the property is no longer documented.
- **Edge Cases**: Ensure no other related properties (like `playbackRate`) are accidentally removed.
