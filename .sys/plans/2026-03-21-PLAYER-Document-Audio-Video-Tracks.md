#### 1. Context & Goal
- **Objective**: Document the `audioTracks` and `videoTracks` properties in the `packages/player/README.md`.
- **Trigger**: The `<helios-player>` component exposes `audioTracks` and `videoTracks` to match the Standard Media API, but they are currently missing from the documentation.
- **Impact**: Ensures the documentation accurately reflects the current reality of the component's API parity, unblocking users from leveraging these standard interfaces.

#### 2. File Inventory
- **Create**:
- **Modify**: `packages/player/README.md` (Add documentation for `audioTracks` and `videoTracks` properties).
- **Read-Only**: `packages/player/src/index.ts` (Reference for property implementation).

#### 3. Implementation Spec
- **Architecture**: Documentation update to the `Standard Media API` section under `Properties`.
- **Pseudo-Code**:
  - Locate the `### Properties` section in `packages/player/README.md`.
  - Add the following entries below `textTracks`:
    - `- \`audioTracks\` (AudioTrackList, read-only): The audio tracks associated with the media element.`
    - `- \`videoTracks\` (VideoTrackList, read-only): The video tracks associated with the media element.`
- **Public API Changes**: None (documentation only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `cat packages/player/README.md | grep "audioTracks"` and `cat packages/player/README.md | grep "videoTracks"`
- **Success Criteria**: Both properties are visible in the markdown output within the Properties section.
- **Edge Cases**: Ensure the formatting exactly matches the surrounding property definitions (e.g., `- \`propertyName\` (Type, read-only): Description`).