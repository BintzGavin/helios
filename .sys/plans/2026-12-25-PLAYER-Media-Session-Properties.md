#### 1. Context & Goal
- **Objective**: Expose standard media session properties (`mediaTitle`, `mediaArtist`, `mediaAlbum`, `mediaArtwork`) on the `HeliosPlayer` class to match the documented attributes.
- **Trigger**: The README states that `<helios-player>` supports `media-title`, `media-artist`, `media-album`, and `media-artwork` attributes, but these are not exposed as JavaScript properties on the class, causing a gap in the API surface.
- **Impact**: Allows programmatic access and modification of the media session metadata, improving parity with the HTMLMediaElement interface and making it easier for host applications to update metadata dynamically.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/src/index.ts` - Add getters and setters for `mediaTitle`, `mediaArtist`, `mediaAlbum`, and `mediaArtwork` that reflect the respective HTML attributes.
- **Read-Only**: `packages/player/README.md` (to verify attribute names), `packages/player/src/features/media-session.ts` (to understand how metadata is consumed)

#### 3. Implementation Spec
- **Architecture**: Standard Web Component attribute reflection. The getters will read the attribute (or return an empty string/null), and the setters will update or remove the attribute. The existing `attributeChangedCallback` already watches these attributes (`if (name.startsWith("media-"))`) and calls `this.mediaSession?.updateMetadata()`.
- **Pseudo-Code**:
  ```typescript
  public get mediaTitle(): string { return this.getAttribute("media-title") || ""; }
  public set mediaTitle(val: string) { this.setAttribute("media-title", val); }

  public get mediaArtist(): string { return this.getAttribute("media-artist") || ""; }
  public set mediaArtist(val: string) { this.setAttribute("media-artist", val); }

  public get mediaAlbum(): string { return this.getAttribute("media-album") || ""; }
  public set mediaAlbum(val: string) { this.setAttribute("media-album", val); }

  public get mediaArtwork(): string { return this.getAttribute("media-artwork") || ""; }
  public set mediaArtwork(val: string) { this.setAttribute("media-artwork", val); }
  ```
- **Public API Changes**: Adds `mediaTitle`, `mediaArtist`, `mediaAlbum`, and `mediaArtwork` properties to `HeliosPlayer`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**: All tests pass, ensuring that exposing these properties does not break existing functionality. New properties can be verified manually or by adding unit tests in the execution phase.
- **Edge Cases**: Setting properties to empty strings should work correctly.
