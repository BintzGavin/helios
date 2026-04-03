# Context & Goal
- **Objective**: Document the `audioTracks` and `videoTracks` properties in the standard media API section of the `README.md`.
- **Trigger**: The `<helios-player>` Web Component implements `audioTracks` and `videoTracks` getters for API parity, but they are completely missing from the "Standard Media API" properties list in `packages/player/README.md`.
- **Impact**: Accurately reflects the player's capabilities to developers relying on the documentation.

# File Inventory
- **Modify**: `packages/player/README.md`

# Implementation Spec
- **Architecture**: Append the missing properties to the list of Standard Media API Properties in the documentation.
- **Pseudo-Code**:
  - Add `- \`audioTracks\` (AudioTrackList, read-only): The audio tracks associated with the media element.` under the Properties section.
  - Add `- \`videoTracks\` (VideoTrackList, read-only): The video tracks associated with the media element.` under the Properties section.
- **Public API Changes**: None.
- **Dependencies**: None.

# Test Plan
- **Verification**: `cat packages/player/README.md | grep -E 'audioTracks|videoTracks'`
- **Success Criteria**: The `audioTracks` and `videoTracks` properties are present in the documentation.
- **Edge Cases**: None.
