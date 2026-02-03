# STUDIO: Implement Server-Side Render Formats

#### 1. Context & Goal
- **Objective**: Implement support for **WebM** and **GIF** output formats in Helios Studio's server-side rendering (currently hardcoded to MP4).
- **Trigger**: Vision gap in "Planned Features" ("Multiple formats - MP4, WebM, GIF") and "Renders Panel" functionality.
- **Impact**: Enables users to generate transparent videos (WebM) and shareable animations (GIF) directly from the Studio interface, fulfilling the "Multiple formats" promise.

#### 2. File Inventory
- **Modify**: `packages/studio/src/components/RendersPanel/RenderConfig.tsx` (Add Format selector UI)
- **Modify**: `packages/studio/src/context/StudioContext.tsx` (Update `RenderConfig` type and state)
- **Modify**: `packages/studio/src/server/render-manager.ts` (Handle `format` option to set extension and default codecs)
- **Read-Only**: `packages/renderer/src/Renderer.ts` (Reference for codec handling)

#### 3. Implementation Spec
- **Architecture**:
  - Extend the `RenderConfig` interface to include a `format` field (`'mp4' | 'webm' | 'gif'`).
  - Update the UI to allow users to select the format.
  - In the backend (`render-manager`), map the selected format to the correct file extension and default FFmpeg video codec (if not explicitly overridden by the user).

- **Public API Changes**:
  - `POST /api/render` body now accepts `format: 'mp4' | 'webm' | 'gif'`.

- **Pseudo-Code**:
  1.  **UI (`RenderConfig.tsx`)**:
      - Add a `<select>` for "Format" with options: MP4 (H.264), WebM (VP9), GIF.
      - Bind to `config.format`.

  2.  **Context (`StudioContext.tsx`)**:
      - Update `RenderConfig` interface: `format?: 'mp4' | 'webm' | 'gif'`.
      - Update `DEFAULT_RENDER_CONFIG` to include `format: 'mp4'`.
      - Pass `format` in `startRender` payload.

  3.  **Backend (`render-manager.ts`)**:
      - In `startRender(options)`:
        - Extract `format` (default 'mp4').
        - Determine extension:
          - `webm` -> `.webm`
          - `gif` -> `.gif`
          - `mp4` -> `.mp4`
        - Determine default `videoCodec` if `options.videoCodec` is missing:
          - `webm` -> `libvpx-vp9`
          - `gif` -> `gif`
          - `mp4` -> `libx264` (handled by Renderer default, but explicit is fine)
        - Construct `outputPath` using the extension: `render-${jobId}.${extension}`.
        - Construct `outputUrl` similarly.

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  1.  Run `npm run dev` in `packages/studio` (or `npx helios studio` if available).
  2.  Open Studio (`http://localhost:5173`).
  3.  In "Renders" panel, select **WebM** as format.
  4.  Click "Start Render Job".
  5.  Wait for completion.
  6.  Verify the job appears in the list with a `.webm` filename.
  7.  Click "Download" and verify the file plays in a compatible player (e.g., Chrome).
  8.  Repeat for **GIF**.

- **Success Criteria**:
  - Render jobs are saved with correct extensions (`.webm`, `.gif`).
  - Files are valid and playable.
  - Defaults (MP4) still work correctly.

- **Edge Cases**:
  - User selects "WebM" but manually overrides `Video Codec` with `libx264` -> FFmpeg might fail or produce invalid file (User Error, acceptable).
  - Browser doesn't support playback of specific format (e.g. some browsers with WebM) -> "Download" should still work.
