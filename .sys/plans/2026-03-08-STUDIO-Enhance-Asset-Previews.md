# Plan: Enhance Asset Previews in Studio

#### 1. Context & Goal
- **Objective**: Implement rich media previews (Video, Audio, Font) in the Assets Panel to replace generic icons.
- **Trigger**: The current "Assets Panel" implementation uses generic icons for non-image assets, failing the "Preview" requirement of the Vision (README: "Assets Panel - Preview and manage assets").
- **Impact**: Improves usability by allowing users to identify assets visually/audibly before using them. This closes a documented Vision Gap.

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/components/AssetsPanel/AssetItem.css` (Extract styles from AssetItem.tsx)
  - `packages/studio/src/components/AssetsPanel/AssetItem.test.tsx` (New unit tests)
- **Modify**:
  - `packages/studio/src/components/AssetsPanel/AssetItem.tsx` (Implement preview logic, remove inline styles)
- **Read-Only**:
  - `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx` (Context usage)

#### 3. Implementation Spec
- **Architecture**:
  - Refactor `AssetItem` to use CSS Modules or standard CSS classes defined in `AssetItem.css`.
  - The component should switch rendering based on `asset.type`.

- **Logic**:
  - **Video**:
    - Render a `<video>` element.
    - Attributes: `muted`, `loop`, `playsInline`.
    - Behavior: `onMouseEnter` calls `.play()`, `onMouseLeave` calls `.pause()` and resets `currentTime`.
  - **Audio**:
    - Render a container with a musical note icon.
    - Overlay a "Play/Pause" button (Unicode or Icon).
    - State: Track `isPlaying`.
    - Behavior: Click toggles playback using `new Audio(asset.url)`. ensure cleanup on unmount.
  - **Font**:
    - Use `FontFace` API to load the font dynamically.
    - Name the font unique to the asset (e.g., `font-${asset.id}`).
    - Render sample text ("Aa" or "ABC") with `fontFamily` set to the loaded font.
    - Handle loading errors gracefully.
  - **Image**:
    - Keep existing `<img>` logic.
  - **Styles**:
    - Ensure all preview containers have a fixed aspect ratio (e.g., square or 16:9 box) to maintain grid alignment.
    - Add hover overlay for "Delete" button (existing feature, just styling).

- **Dependencies**:
  - None (Uses standard DOM APIs).

#### 4. Test Plan
- **Unit Tests (`AssetItem.test.tsx`)**:
  - Use `@testing-library/react` and `vitest`.
  - **Video**: Render with type 'video'. Assert `<video>` tag presence and `src` attribute.
  - **Audio**: Render with type 'audio'. Assert Play button presence.
  - **Font**: Render with type 'font'. Assert style contains `fontFamily`. (Note: Mock `FontFace` if necessary in JSDOM).
  - **Interaction**: Test hover events on video (spy on `play`/`pause` methods).

- **Verification**:
  - Run `npx helios studio`.
  - **Manual Check**:
    - Upload a generic `.mp4` file -> Verify it plays on hover.
    - Upload a generic `.mp3`/`.wav` file -> Verify it plays on click.
    - Upload a `.ttf`/`.woff` file -> Verify the sample text uses the font.
    - Upload a `.png`/`.jpg` -> Verify it still works.
