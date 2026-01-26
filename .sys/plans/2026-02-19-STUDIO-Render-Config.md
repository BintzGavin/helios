#### 1. Context & Goal
- **Objective**: Implement Render Configuration UI in Studio to enable DOM rendering and codec customization.
- **Trigger**: Vision Gap - The "Renders Panel" currently hardcodes the rendering mode to `'canvas'` and lacks options for quality control. This blocks the rendering of DOM/CSS-based compositions, which violates the "Framework-agnostic" promise.
- **Impact**: Unlocks support for standard HTML/CSS animations in Studio (critical for "Framework-agnostic" promise) and allows users to tune output quality (bitrate, codec).

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/components/RendersPanel/RenderConfig.tsx` (UI for render settings)
- **Modify**:
  - `packages/studio/src/components/RendersPanel/RendersPanel.tsx` (Integrate config UI)
  - `packages/studio/src/context/StudioContext.tsx` (Add configuration state and update `startRender`)
  - `packages/studio/src/server/render-manager.ts` (Update interface to accept and forward options)
- **Read-Only**:
  - `packages/renderer/src/types.ts` (To ensure type compatibility)

#### 3. Implementation Spec
- **Architecture**:
  - Extends `StudioContext` to manage `renderConfig` state (mode, bitrate, codec).
  - Updates the `/api/render` payload to include these configuration fields.
  - Updates the backend `render-manager` to forward these options to the `Renderer` constructor.
- **Pseudo-Code**:
  - **RenderConfig.tsx**: Simple form with:
    - `select` for Mode (`canvas` | `dom`) - Default `canvas`
    - `input` for Bitrate (e.g., "5M")
    - `input` for Codec (default "libx264")
  - **StudioContext**:
    - Add `renderConfig` state.
    - Update `startRender` to include `renderConfig` in the JSON body.
  - **render-manager.ts**:
    - Update `StartRenderOptions` interface to include `mode`, `videoBitrate`, `videoCodec`, `pixelFormat`.
    - Pass these fields to `new Renderer({...})`.
- **Public API Changes**:
  - `StudioContext` now exposes `renderConfig` and `setRenderConfig`.
  - `/api/render` endpoint accepts additional fields in the JSON body.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npx helios studio`.
  - Verify "Render Settings" UI appears in Renders Panel.
  - Change Mode to `'dom'`.
  - Click "Start Render".
  - Verify terminal output shows `Starting render... (Mode: dom)`.
  - Verify job completes successfully.
- **Success Criteria**:
  - Users can select `'dom'` mode for rendering.
  - Render settings (like bitrate) are correctly passed to the Renderer.
- **Edge Cases**:
  - Invalid bitrate string (Renderer should handle or error gracefully).
  - Missing fields (Should fall back to defaults).
  - Switching modes should persist config until page reload.
