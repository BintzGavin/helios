#### 1. Context & Goal
- **Objective**: Document missing Standard Media API properties and methods in the `README.md`.
- **Trigger**: The `audioTracks`, `videoTracks` properties and the `captureStream()` method are fully implemented in `<helios-player>` (`packages/player/src/index.ts`) but missing from the `README.md` documentation.
- **Impact**: Ensures accurate documentation and API parity awareness for developers using the `<helios-player>` Web Component.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/player/README.md`: Add `audioTracks`, `videoTracks`, and `captureStream()` to the `Standard Media API` section.
- **Read-Only**: `packages/player/src/index.ts`

#### 3. Implementation Spec
- **Architecture**: Markdown documentation update.
- **Pseudo-Code**:
  - Locate the `### Methods` section in `packages/player/README.md`.
  - Add `- captureStream(): Promise<MediaStream> - Returns a MediaStream containing the video and audio of the player (Direct Mode only).`
  - Locate the `### Properties` section.
  - Add `- audioTracks (AudioTrackList, read-only): The audio tracks associated with the media element.`
  - Add `- videoTracks (VideoTrackList, read-only): The video tracks associated with the media element.`
- **Public API Changes**: None (documentation only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `cat packages/player/README.md | grep -E "captureStream|audioTracks|videoTracks"`
- **Success Criteria**: The command outputs the newly added documentation lines.
- **Edge Cases**: Ensure the formatting perfectly matches the existing Markdown structure.
