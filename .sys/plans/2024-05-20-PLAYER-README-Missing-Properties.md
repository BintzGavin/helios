#### 1. Context & Goal
- **Objective**: Document missing properties and methods in the `README.md` API reference.
- **Trigger**: The `<helios-player>` implementation includes public methods like `getController()` and properties like `src`, `autoplay`, `loop`, `controls`, `poster`, `preload`, `sandbox`, `interactive`, and OS Media Session properties which are not documented in the Properties and Methods sections.
- **Impact**: Provides accurate documentation for developers consuming the web component.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/README.md`
- **Read-Only**: `packages/player/src/index.ts`

#### 3. Implementation Spec
- **Architecture**: Documentation update to match existing API.
- **Pseudo-Code**:
  - Open `packages/player/README.md`.
  - Add `- getController(): HeliosController | null - Returns the current player controller.` to the Methods section.
  - Add missing properties (`src`, `autoplay`, `loop`, `controls`, `poster`, `preload`, `sandbox`, `interactive`, `disablePictureInPicture`, `mediaTitle`, `mediaArtist`, `mediaAlbum`, `mediaArtwork`, `fps`) to the Properties section with their descriptions and types.
- **Public API Changes**: None (documentation only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**: Tests pass and README accurately reflects the API.
- **Edge Cases**: Ensure the formatting matches existing markdown lists.