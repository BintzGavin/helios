#### 1. Context & Goal
- **Objective**: Document `audioTracks` and `videoTracks` API properties in `README.md`.
- **Trigger**: The `audioTracks` and `videoTracks` API properties were implemented on `HeliosPlayer` (verified by `docs/status/PLAYER.md` v0.66.0 and v0.64.0 and `packages/player/src/index.ts`) but are missing from the `README.md` documentation properties list.
- **Impact**: Provides accurate and up-to-date documentation to developers utilizing the player, closing an existing documentation gap.

#### 2. File Inventory
- **Create**: (None)
- **Modify**: `packages/player/README.md` (Add `audioTracks` and `videoTracks` to the Properties list under Standard Media API).
- **Read-Only**: `packages/player/src/index.ts` (Already checked logic to verify implementation).

#### 3. Implementation Spec
- **Architecture**: Simple documentation update to achieve README parity with implemented features.
- **Pseudo-Code**: Insert documentation entries into the "Properties" list of `packages/player/README.md`.
  - `- \`audioTracks\` (AudioTrackList, read-only): The audio tracks associated with the media element.`
  - `- \`videoTracks\` (VideoTrackList, read-only): The video tracks associated with the media element.`
- **Public API Changes**: None (just documenting what exists).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `cat packages/player/README.md | grep -E "audioTracks|videoTracks"`
- **Success Criteria**: The output successfully displays the descriptions for `audioTracks` and `videoTracks` within the `README.md`.
- **Edge Cases**: Ensure the formatting remains consistent with the rest of the file.
