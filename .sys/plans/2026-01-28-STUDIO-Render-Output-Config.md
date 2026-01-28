# 📋 Plan: Enable Custom Render Output Configuration

#### 1. Context & Goal
- **Objective**: Update the Studio's Render Panel to allow users to specify a custom filename and output format (MP4 or WebM) for server-side render jobs.
- **Trigger**: Currently, render jobs are auto-named `render-{jobId}.mp4` and locked to MP4, which limits usability and file organization.
- **Impact**: Users can generate meaningfully named files in their preferred format, improving the "Render Job Management" feature set.

#### 2. File Inventory
- **Modify**:
  - `packages/studio/src/server/render-manager.ts`: Update `startRender` logic.
  - `packages/studio/src/context/StudioContext.tsx`: Update `RenderConfig` interface and `startRender`.
  - `packages/studio/src/components/RendersPanel/RenderConfig.tsx`: Add UI inputs.
  - `packages/studio/src/components/RendersPanel/RendersPanel.tsx`: Update generic usage.
- **Read-Only**:
  - `packages/studio/src/server/index.ts` (API plugin entry point)

#### 3. Implementation Spec
- **Architecture**:
  - Extend `RenderConfig` state to include `filename` and `format`.
  - Pass these values via `StudioContext.startRender` to the `/api/render` endpoint.
  - In `render-manager`, sanitize the filename and append the unique Job ID to prevent collisions (e.g., `my-video-{jobId}.webm`).

- **Public API Changes**:
  - `StartRenderOptions` in `render-manager.ts` adds `filename?: string` and `format?: 'mp4' | 'webm'`.
  - `RenderConfigData` in `StudioContext.tsx` adds `filename?: string` and `format?: 'mp4' | 'webm'`.

- **Pseudo-Code**:
  ```typescript
  // 1. StudioContext.startRender
  const payload = {
    ...renderConfig,
    filename: renderConfig.filename || activeComposition.name,
    format: renderConfig.format || 'mp4'
  };
  await fetch('/api/render', { body: JSON.stringify(payload) });

  // 2. render-manager.startRender
  const cleanName = sanitize(options.filename || 'render');
  const ext = options.format === 'webm' ? 'webm' : 'mp4';
  const outputPath = path.join(rendersDir, `${cleanName}-${jobId}.${ext}`);
  ```

#### 4. Test Plan
- **Verification**:
  - Run `npx helios studio`.
  - Navigate to Renders Panel.
  - Enter "custom-test" in Filename input.
  - Select "WebM" as Format.
  - Click "Start Render Job".
  - Wait for completion.
  - Verify file `renders/custom-test-{jobId}.webm` exists.
  - Click Download and verify it opens.
- **Success Criteria**:
  - Render job completes with correct filename and extension.
  - File is playable.
- **Edge Cases**:
  - Special characters in filename (must be sanitized).
  - Empty filename (must default to composition name).
