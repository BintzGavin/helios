# 2026-02-18-STUDIO-webcodecs-preference

#### 1. Context & Goal
- **Objective**: Expose the `webCodecsPreference` option in the Studio Render Config UI to allow users to force software encoding or disable WebCodecs.
- **Trigger**: The Renderer (`v1.80.0`) added `webCodecsPreference` for deterministic rendering, but Studio (`v0.107.3`) does not expose it. This is a critical gap for ensuring pixel-perfect consistency across machines by bypassing hardware acceleration quirks.
- **Impact**: Enables users to debug rendering issues and ensures consistent output regardless of GPU capabilities.

#### 2. File Inventory
- **Modify**:
  - `packages/studio/src/components/RendersPanel/RenderConfig.tsx`: Add dropdown for `webCodecsPreference`.
  - `packages/studio/src/context/StudioContext.tsx`: Update `RenderConfig` interface and default state.
  - `packages/studio/src/server/render-manager.ts`: Update `StartRenderOptions` and pass preference to `RenderOrchestrator`.

#### 3. Implementation Spec
- **Architecture**:
  - Update `RenderConfig` interface in `StudioContext` to include optional `webCodecsPreference`.
  - Pass this property through `startRender` API call to the backend.
  - In `render-manager.ts`, extract this property from the request body and pass it to `RenderOrchestrator.render` and `RenderOrchestrator.plan` via `DistributedRenderOptions`.
- **Pseudo-Code**:
  - **RenderConfig.tsx**: Add `<select>` for `webCodecsPreference` with options 'hardware', 'software', 'disabled'. Default to undefined (auto). Only show this option when `mode` is `canvas`.
  - **StudioContext.tsx**: Add `webCodecsPreference?: 'hardware' | 'software' | 'disabled'` to `RenderConfig` interface. Update `DEFAULT_RENDER_CONFIG` (or equivalent initialization).
  - **render-manager.ts**: Destructure `webCodecsPreference` from `options` and add to the `renderOptions` object passed to the orchestrator.
- **Public API Changes**:
  - `StartRenderOptions` interface in `render-manager.ts` gains optional `webCodecsPreference`.
  - `/api/render` and `/api/render/job-spec` endpoints accept `webCodecsPreference` in the JSON body.
- **Dependencies**: None (Renderer v1.80.0 dependency is already satisfied).

#### 4. Test Plan
- **Verification**:
  - Run `npx helios studio` and navigate to the Renders Panel.
  - Verify "WebCodecs Preference" dropdown appears when "Canvas" mode is selected.
  - Select "Software" from the dropdown.
  - Click "Export Job Spec".
  - Verify the downloaded JSON file contains `"webCodecsPreference": "software"`.
  - Start a render job and verify it completes without error.
- **Success Criteria**: The job spec correctly reflects the user's selection, and the server receives the property.
- **Edge Cases**: Verify selecting "Auto" (undefined) omits the property or sends `undefined`, allowing default behavior. Verify "Disabled" correctly passes "disabled" to force `toDataURL` fallback.
