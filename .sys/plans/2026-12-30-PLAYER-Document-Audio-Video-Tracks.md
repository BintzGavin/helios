# Context & Goal
- **Objective**: Document missing `audioTracks` and `videoTracks` properties in the README.md to ensure complete API parity documentation.
- **Trigger**: Vision gap identified during exploration. `audioTracks` and `videoTracks` getters are fully implemented in `index.ts` but are entirely missing from the `Properties` section of `README.md`.
- **Impact**: Improves documentation accuracy and developer experience by exposing the available tracking lists, aligning documentation with the implemented HTMLMediaElement parity.

# File Inventory
- **Create**: (None)
- **Modify**: `packages/player/README.md` (Add missing properties under "Properties" list)
- **Read-Only**: `packages/player/src/index.ts`

# Implementation Spec
- **Architecture**: Documentation updates to match implementation state.
- **Pseudo-Code**:
  - Locate the `### Properties` section in `packages/player/README.md`.
  - Add `- \`audioTracks\` (AudioTrackList, read-only): The audio tracks associated with the media element.` right after `textTracks`.
  - Add `- \`videoTracks\` (VideoTrackList, read-only): The video tracks associated with the media element.` right after `audioTracks`.
- **Public API Changes**: No code changes, only documentation.
- **Dependencies**: None.

# Test Plan
- **Verification**: `grep -i "audioTracks" packages/player/README.md` and `grep -i "videoTracks" packages/player/README.md`
- **Success Criteria**: The README contains the missing track properties matching the implemented getters.
- **Edge Cases**: None.
