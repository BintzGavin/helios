# 1. Context & Goal
- **Objective**: Expose the `webCodecsPreference` configuration option in the Studio UI (Renders Panel) to allow users to control hardware acceleration for WebCodecs during rendering.
- **Trigger**: Vision Gap identified in journal (`[0.107.3] - WebCodecs Preference Gap`) - Renderer supports it, but Studio doesn't expose it.
- **Impact**: Enables users to force software encoding or disable WebCodecs entirely, which is crucial for debugging hardware-specific crashes and ensuring deterministic rendering.

# 2. File Inventory
- **Modify**: `packages/studio/src/context/StudioContext.tsx` (Update `RenderConfig` interface and default state)
- **Modify**: `packages/studio/src/components/RendersPanel/RenderConfig.tsx` (Update `RenderConfigData` interface and add UI selector)
- **Modify**: `packages/studio/src/server/render-manager.ts` (Update `StartRenderOptions` interface and pass option to `RenderOrchestrator`)
- **Read-Only**: `packages/renderer/src/types.ts` (Reference for `RendererOptions`)

# 3. Implementation Spec
- **Architecture**:
  - **Frontend (`RenderConfig.tsx`)**: Add a dropdown for "WebCodecs Preference" with options: "Hardware (Default)", "Software Only", "Disabled".
  - **State (`StudioContext.tsx`)**: Persist this preference in `localStorage` via existing `renderConfig` mechanism.
  - **Backend (`render-manager.ts`)**: Pass `webCodecsPreference` from the API request body to the `RenderOrchestrator` instance.
- **Pseudo-Code**:
  - `RenderConfig.tsx`:
    - Add `webCodecsPreference?: 'hardware' | 'software' | 'disabled'` to `RenderConfigData` interface.
    - Add `<select>` for `webCodecsPreference` with options mapped to these values.
  - `StudioContext.tsx`:
    - Add `webCodecsPreference?: 'hardware' | 'software' | 'disabled'` to `RenderConfig` interface.
  - `render-manager.ts`:
    - Update `StartRenderOptions` interface to include `webCodecsPreference`.
    - In `startRender` and `getRenderJobSpec`, destructure `webCodecsPreference` from `options` and pass it to `DistributedRenderOptions`.
- **Public API Changes**: None (Internal Studio Context/UI changes).
- **Dependencies**: None.

# 4. Test Plan
- **Verification**:
  - Run `npx helios studio` (if possible) or inspect code changes.
  - Verify that `webCodecsPreference` is correctly passed in `render-manager.ts` by inspecting the `startRender` function.
  - Verify `RenderConfig` interface includes `webCodecsPreference`.
  - Verify `RenderConfig.tsx` renders the new control.
- **Success Criteria**:
  - User can select "Hardware", "Software", or "Disabled" for WebCodecs.
  - Selection persists across reloads (via `StudioContext` existing mechanism).
  - Selection is passed to `RenderOrchestrator` when starting a render job.
- **Edge Cases**:
  - Default value (`undefined`) should work as "Hardware" (Renderer default).
  - `disabled` should trigger fallback to image capture (verified by Renderer tests).
