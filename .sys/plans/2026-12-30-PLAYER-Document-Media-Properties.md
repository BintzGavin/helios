#### 1. Context & Goal
- **Objective**: Add missing `mediaTitle`, `mediaArtist`, `mediaAlbum`, and `mediaArtwork` properties to `README.md` and `docs/site/api/player.md`.
- **Trigger**: The recent `mediaSession` implementation added metadata properties to `<helios-player>` (`packages/player/src/index.ts`) that are not yet documented, creating a vision gap.
- **Impact**: Ensures accurate documentation for developers trying to use the MediaSession metadata properties.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `README.md`: Add `mediaTitle`, `mediaArtist`, `mediaAlbum`, and `mediaArtwork` to the "Attributes" or "Properties" section of the Player documentation.
  - `docs/site/api/player.md`: Add the same properties to the "Attributes" and "Properties" sections.
- **Read-Only**: `packages/player/src/index.ts` to confirm exact getters/setters and attribute names.

#### 3. Implementation Spec
- **Architecture**: Documentation updates only. Align the list of documented attributes and properties with what is actually implemented on `HeliosPlayer`.
- **Pseudo-Code**:
  - Read `packages/player/src/index.ts` to verify `mediaTitle`, `mediaArtist`, `mediaAlbum`, and `mediaArtwork` exist as getters/setters mapped to attributes `media-title`, `media-artist`, `media-album`, and `media-artwork`.
  - Open `README.md` and `docs/site/api/player.md`.
  - In the "Attributes" section, add descriptions for `media-title`, `media-artist`, `media-album`, and `media-artwork`.
  - In the "Properties" section, add descriptions for `mediaTitle`, `mediaArtist`, `mediaAlbum`, and `mediaArtwork`.
- **Public API Changes**: None (documentation only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `grep -i "mediaTitle" README.md docs/site/api/player.md`
- **Success Criteria**: The `grep` output correctly finds the documented properties and attributes.
- **Edge Cases**: Ensure `docs/site/api/player.md` formatting remains valid markdown.
