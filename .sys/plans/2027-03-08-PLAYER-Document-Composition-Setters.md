#### 1. Context & Goal
- **Objective**: Document the dynamic composition setter methods in `packages/player/README.md`.
- **Trigger**: The methods `setDuration`, `setFps`, `setSize`, and `setMarkers` were implemented in `HeliosPlayer` (tracked in `docs/status/PLAYER.md` v0.79.0) but are missing from the public API documentation.
- **Impact**: Ensures parity between the implemented Web Component methods and the public API documentation.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/README.md` (Update the `### Methods` section to include the new setters)
- **Read-Only**: `packages/player/src/index.ts`

#### 3. Implementation Spec
- **Architecture**: Use a python script or `sed` to surgically inject the missing methods into the `### Methods` list within the `## Standard Media API` section of `packages/player/README.md`.
- **Pseudo-Code**:
  - Locate the `### Methods` heading.
  - Append the following items to the list:
    - `- \`setDuration(seconds: number): void\` - Updates the composition duration dynamically.`
    - `- \`setFps(fps: number): void\` - Updates the composition framerate dynamically.`
    - `- \`setSize(width: number, height: number): void\` - Updates the composition dimensions dynamically.`
    - `- \`setMarkers(markers: Marker[]): void\` - Updates the timeline markers dynamically.`
- **Public API Changes**: None (documentation only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `grep -n "setDuration" packages/player/README.md` and `grep -n "setMarkers" packages/player/README.md` to ensure the methods were inserted correctly.
- **Success Criteria**: The `grep` output displays the newly added methods within the `packages/player/README.md` file.
- **Edge Cases**: Ensure the formatting matches the existing unordered list style.
