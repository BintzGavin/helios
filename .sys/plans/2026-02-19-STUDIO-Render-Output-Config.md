# 📋 STUDIO: Render Output Config

## 1. Context & Goal
- **Objective**: Implement server-side render configuration for Output Format (MP4, WebM, GIF) and Resolution/FPS overrides in the Studio UI and Backend.
- **Trigger**: Vision gap - "Multiple formats (Planned)" and "Custom resolutions" (README V1.x). Currently, server-side renders are hardcoded to `.mp4` and use the composition's default resolution.
- **Impact**: Enables users to export in different formats and resolutions directly from the Studio interface, bridging the gap between "Preview" and "Production" usage.

## 2. File Inventory
- **Modify**:
  - `packages/studio/src/context/StudioContext.tsx`: Update `RenderConfig` interface and default state.
  - `packages/studio/src/components/RendersPanel/RenderConfig.tsx`: Add UI controls for Format, Resolution (Width/Height), and FPS.
  - `packages/studio/src/server/render-manager.ts`: Update render logic to respect format (extension, defaults) and resolution overrides.
  - `packages/studio/src/server/render-manager.test.ts`: Add test cases for format/extension verification.

## 3. Implementation Spec
- **Architecture**:
  - **State**: Extend `RenderConfig` in `StudioContext` to include `format` ('mp4'|'webm'|'gif'), `width`, `height`, `fps`.
  - **UI**: Update `RenderConfig.tsx` to provide a dropdown for Format and number inputs for overrides.
  - **Backend**: Update `startRender` in `render-manager.ts` to:
    - Determine output extension based on `format`.
    - Apply default codecs if not specified (`libx264` for mp4, `libvpx-vp9` for webm, `gif` for gif).
    - Pass resolution/FPS overrides to `Renderer`.

- **Pseudo-Code**:
  ```typescript
  // packages/studio/src/server/render-manager.ts
  function startRender(options) {
    const ext = options.format === 'gif' ? 'gif' : options.format === 'webm' ? 'webm' : 'mp4';
    const outputPath = path.resolve(rendersDir, `render-${jobId}.${ext}`);

    const rendererOptions = {
       // ...
       videoCodec: options.videoCodec || (options.format === 'webm' ? 'libvpx-vp9' : options.format === 'gif' ? 'gif' : 'libx264'),
       // ...
    };
    // ...
  }
  ```

- **Public API Changes**:
  - `RenderConfig` interface in `StudioContext`.
  - `StartRenderOptions` in `render-manager`.

- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  - Run `npm test -w packages/studio` to verify regression tests and new logic.
  - Run `npx helios studio`, open Renders Panel:
    1. Select "WebM" -> Render -> Verify `.webm` file created and playable.
    2. Select "GIF" -> Render -> Verify `.gif` file created.
    3. Change Resolution to 500x500 -> Render -> Verify output dimensions.
- **Success Criteria**:
  - Output files have correct extensions.
  - Render jobs complete successfully for all formats.
  - Automated tests pass.
- **Edge Cases**:
  - Invalid resolution (negative numbers) -> Should be handled by UI validation or Renderer.
  - GIF rendering with 'copy' codec -> Should throw error or fallback (we handle default).
