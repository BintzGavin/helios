#### 1. Context & Goal
- **Objective**: Document `videoTracks` and `audioTracks` properties in `README.md` and add API parity tests for `audioTracks`.
- **Trigger**: The `<helios-player>` component exposes `videoTracks` and `audioTracks` properties, fulfilling the standard media API parity. However, they are missing from the README documentation. Furthermore, while `videoTracks` has test coverage in `api_parity.test.ts`, `audioTracks` is missing API parity test coverage in that file.
- **Impact**: Ensures accurate documentation for the HTMLMediaElement parity and guarantees comprehensive test coverage for all standard media properties.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/player/README.md`: Add `videoTracks` and `audioTracks` under the Properties section.
  - `packages/player/src/api_parity.test.ts`: Add `audioTracks` API parity test to match the `videoTracks` test style.
- **Read-Only**:
  - `packages/player/src/index.ts` (to verify property names/types)
  - `packages/player/src/features/audio-tracks.ts` (to verify types)

#### 3. Implementation Spec
- **Architecture**: Update `README.md` to include `audioTracks` (AudioTrackList) and `videoTracks` (VideoTrackList) in the `### Properties` list. Add an `it('should support audioTracks API', ...)` block to `packages/player/src/api_parity.test.ts` to test that `player.audioTracks` is defined and correctly returns a `HeliosAudioTrackList` instance with length `> 0`.
- **Pseudo-Code**:
  - `packages/player/README.md`: Insert `- \`audioTracks\` (AudioTrackList, read-only): The audio tracks associated with the media element.` and `- \`videoTracks\` (VideoTrackList, read-only): The video tracks associated with the media element.` in the Properties list.
  - `packages/player/src/api_parity.test.ts`: Add a test checking `player.audioTracks` is defined, checking `player.audioTracks.length`, checking `player.audioTracks[0].kind`, and verifying the track toggling logic if applicable.
- **Public API Changes**: None (documentation and test coverage only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/player`
- **Success Criteria**: All tests pass and `api_parity.test.ts` correctly executes the new `audioTracks` test.
- **Edge Cases**: None.
