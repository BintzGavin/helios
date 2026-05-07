#### 1. Context & Goal
- **Objective**: Update `README.md` to document missing properties, events, and API members that exist in the codebase but are undocumented.
- **Trigger**: The Vision vs Reality analysis revealed that `audioTracks`, `videoTracks` properties and `enterpictureinpicture`, `leavepictureinpicture` events exist in the implementation but are not documented in the README.
- **Impact**: Ensures that users have an accurate and up-to-date reference for the `<helios-player>` API and its features.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/README.md` (Update API documentation)
- **Read-Only**: `packages/player/src/index.ts`

#### 3. Implementation Spec
- **Architecture**: Documentation updates.
- **Pseudo-Code**:
  - Add `- \`audioTracks\` (AudioTrackList, read-only): The audio tracks associated with the media element.` under the Properties section.
  - Add `- \`videoTracks\` (VideoTrackList, read-only): The video tracks associated with the media element.` under the Properties section.
  - Add `- \`enterpictureinpicture\`: Fired when the player enters Picture-in-Picture mode.` under the Events section.
  - Add `- \`leavepictureinpicture\`: Fired when the player leaves Picture-in-Picture mode.` under the Events section.
- **Public API Changes**: No changes to the code, only to the README.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run build -w packages/player`
- **Success Criteria**: The README includes the new properties and events.
- **Edge Cases**: None.
