#### 1. Context & Goal
- **Objective**: Document the `setDuration`, `setFps`, `setSize`, and `setMarkers` methods in the project README.
- **Trigger**: Vision gap identified - these composition setters were recently exposed on the `HeliosPlayer` API but were left undocumented in the `README.md` methods section.
- **Impact**: Ensures the documentation accurately reflects the public API of the `<helios-player>` Web Component, allowing developers to programmatically override composition properties.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/README.md` (Add documentation for `setDuration`, `setFps`, `setSize`, and `setMarkers` to the Methods section)
- **Read-Only**: `packages/player/src/index.ts` (To verify method signatures)

#### 3. Implementation Spec
- **Architecture**: Update markdown documentation to align with existing implementation.
- **Pseudo-Code**:
  - Locate the `### Methods` section in `packages/player/README.md`.
  - Add the following entries:
    - `- \`setDuration(seconds: number): void\` - Overrides the duration of the composition.`
    - `- \`setFps(fps: number): void\` - Overrides the frames per second of the composition.`
    - `- \`setSize(width: number, height: number): void\` - Overrides the render dimensions of the composition.`
    - `- \`setMarkers(markers: Marker[]): void\` - Overrides the timeline markers of the composition.`
- **Public API Changes**: None (documentation only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `cat packages/player/README.md | grep -E "setDuration|setFps|setSize|setMarkers"`
- **Success Criteria**: The output displays the newly documented methods with their correct signatures.
- **Edge Cases**: Ensure the formatting perfectly matches the surrounding markdown list items.
