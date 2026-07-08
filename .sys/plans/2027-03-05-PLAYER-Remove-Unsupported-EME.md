#### 1. Context & Goal
- **Objective**: Remove the unsupported `setMediaKeys` method and `mediaKeys` property from both the codebase and documentation.
- **Trigger**: Discovered an architectural misalignment: `setMediaKeys` and `mediaKeys` were implemented for HTMLMediaElement parity, but Encrypted Media Extensions (EME) and DRM functionality are fundamentally incompatible with and irrelevant to the Helios video composition architecture (which focuses on canvas rendering, WebCodecs, and offline rendering, not DRM streaming).
- **Impact**: Cleans up the public API by removing misleading, unsupported methods, adhering to the principle that exposed APIs must have functional architectural backing.

#### 2. File Inventory
- **Create**: None.
- **Modify**: `packages/player/src/index.ts` (Remove `setMediaKeys` and `mediaKeys`).
- **Modify**: `packages/player/README.md` (Remove `setMediaKeys` and `mediaKeys` documentation).
- **Read-Only**: None.

#### 3. Implementation Spec
- **Architecture**: Web Component API cleanup.
- **Pseudo-Code**:
  1. In `HeliosPlayer` class within `packages/player/src/index.ts`, delete the `_mediaKeys` private property.
  2. Delete the `mediaKeys` getter.
  3. Delete the `setMediaKeys` public async method.
  4. In `packages/player/README.md`, locate and delete the line `- \`setMediaKeys(mediaKeys: MediaKeys | null): Promise<void>\` - Sets the MediaKeys object to use for decrypting media.` from the Methods section.
  5. In `packages/player/README.md`, locate and delete the line `- \`mediaKeys\` (MediaKeys | null, read-only): The MediaKeys object associated with the media element.` from the Properties section.
- **Public API Changes**: Removed `setMediaKeys` and `mediaKeys` from `HeliosPlayer`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**: All tests pass and the unsupported EME methods are successfully removed from the API surface and documentation.
- **Edge Cases**: Ensure removing these doesn't break any parity test loops that iterate over standard properties.
