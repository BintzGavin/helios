#### 1. Context & Goal
- **Objective**: Add `mediaTitle`, `mediaArtist`, `mediaAlbum`, and `mediaArtwork` properties to the README to match the implementation in `HeliosPlayer`.
- **Trigger**: Discovered that properties for OS Media Session attributes (`media-title`, `media-artist`, `media-album`, `media-artwork`) are implemented in `index.ts` but missing from the README's Properties section.
- **Impact**: Ensures accurate documentation for the HTMLMediaElement API parity.

#### 2. File Inventory
- **Create**: none
- **Modify**: `packages/player/README.md`
- **Read-Only**: `packages/player/src/index.ts`

#### 3. Implementation Spec
- **Architecture**: Append the missing properties to the "Properties" list in `packages/player/README.md`.
- **Pseudo-Code**:
  - Add `- \`mediaTitle\` (string): Reflected media-title attribute.`
  - Add `- \`mediaArtist\` (string): Reflected media-artist attribute.`
  - Add `- \`mediaAlbum\` (string): Reflected media-album attribute.`
  - Add `- \`mediaArtwork\` (string): Reflected media-artwork attribute.`
- **Public API Changes**: Documentation only.
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: `cat packages/player/README.md | grep "mediaTitle"`
- **Success Criteria**: The README includes the four Media Session properties.
- **Edge Cases**: None
