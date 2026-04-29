# Context & Goal
- **Objective**: Document the `audioTracks` and `videoTracks` properties in the player's README.
- **Trigger**: The implementation includes `get audioTracks()` and `get videoTracks()` in `packages/player/src/index.ts`, but they are missing from `packages/player/README.md`.
- **Impact**: Completes API documentation parity with the actual implementation and HTMLMediaElement spec.

# File Inventory
- **Create**: None
- **Modify**: `packages/player/README.md` (Add `audioTracks` and `videoTracks` to the Properties list)
- **Read-Only**: `packages/player/src/index.ts`

# Implementation Spec
- **Architecture**: Documentation update to match codebase reality.
- **Pseudo-Code**:
  - Locate the `### Properties` section in `packages/player/README.md`
  - Add `- \`audioTracks\` (AudioTrackList, read-only): The audio tracks associated with the media element.` right after `textTracks`
  - Add `- \`videoTracks\` (VideoTrackList, read-only): The video tracks associated with the media element.` right after `audioTracks`
- **Public API Changes**: None (Documentation only)
- **Dependencies**: None

# Test Plan
- **Verification**: `cat packages/player/README.md | grep "audioTracks"` and `cat packages/player/README.md | grep "videoTracks"`
- **Success Criteria**: The commands return the new property documentation lines.
- **Edge Cases**: Ensure the formatting perfectly matches the existing markdown list.
