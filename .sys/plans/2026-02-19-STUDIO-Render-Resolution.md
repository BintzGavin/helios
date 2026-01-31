#### 1. Context & Goal
- **Objective**: Implement Render Resolution and FPS configuration in Studio's Renders Panel.
- **Trigger**: Vision Gap - The "Renders Panel" lacks controls for output resolution and FPS, forcing users to modify the composition source just to render a draft or different format.
- **Impact**: Enables standard workflows like "Render Proxy (720p)" or "Render 60fps version" without altering the composition metadata. Also ensures render job history accurately reflects the settings used.

#### 2. File Inventory
- **Modify**:
  - `packages/studio/src/context/StudioContext.tsx` (Update `RenderConfig` and `RenderJob` interfaces to include `width`, `height`, `fps`).
  - `packages/studio/src/server/render-manager.ts` (Update `RenderJob` interface and `startRender` to persist these settings).
  - `packages/studio/src/components/RendersPanel/RenderConfig.tsx` (Add inputs for Width, Height, FPS with "Default" logic).
  - `packages/studio/src/components/RendersPanel/RendersPanel.tsx` (Pass default composition values to `RenderConfig`).

#### 3. Implementation Spec
- **Architecture**:
  - Extend `RenderConfig` state in `StudioContext` to support optional `width`, `height`, `fps`.
  - Update `RenderJob` in both frontend and backend to store the resolution/fps used for the job, ensuring history is accurate.
  - In `startRender` (backend), save these options to the `RenderJob` object before starting the process.
- **Pseudo-Code**:
  - **StudioContext.tsx**:
    - Update `RenderConfig` interface: `width?: number; height?: number; fps?: number;`.
    - Update `RenderJob` interface: `width?: number; height?: number; fps?: number;`.
  - **render-manager.ts**:
    - Update `RenderJob` interface to match.
    - In `startRender`:
      - Add `width: options.width`, `height: options.height`, `fps: options.fps` to the new `job` object.
  - **RenderConfig.tsx**:
    - Accept `defaults: { width: number, height: number, fps: number }`.
    - Add UI section "Output Settings".
    - Add "Resolution" dropdown: [Default, 720p, 1080p, Custom].
    - On change:
        - "Default": set `width/height` to `undefined`.
        - "720p": set `width: 1280, height: 720`.
        - "Custom": Show inputs.
    - Add FPS input (placeholder = default fps).
  - **RendersPanel.tsx**:
    - Pass `activeComposition.metadata` (or `canvasSize`) as defaults to `RenderConfig`.
- **Public API Changes**:
  - `RenderJob` API response now includes `width`, `height`, `fps`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npx helios studio`.
  - Select a composition (e.g., 1920x1080).
  - Open Renders Panel.
  - Set Resolution to "Custom" -> 100x100.
  - Click "Start Render Job".
  - Check terminal logs: `[RenderManager] Starting render job ...`
  - Inspect `renders/jobs.json` to verify `width: 100` and `height: 100` are saved in the job entry.
- **Success Criteria**:
  - Render job executes with overridden settings.
  - Render job history (`jobs.json`) persists the settings.
  - UI correctly shows defaults when no override is set.
- **Edge Cases**:
  - Invalid inputs (negative numbers) -> Prevent or clamp.
  - Switching compositions -> Config stays global (user choice).

#### 5. Pre-commit
- **Pre-commit**:
    - Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.
