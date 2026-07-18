#### 1. Context & Goal
- **Objective**: Implement a visual Hot Reload Indicator in the Studio UI.
- **Trigger**: The README states under "Planned Features": "Hot Reloading: Instant preview updates as you edit your composition code." While HMR works via Vite, there is no visual indicator confirming to the user that a hot reload has occurred, which is a standard DX feature.
- **Impact**: Provides clear visual feedback that composition changes have been successfully applied, improving the WYSIWYG editing experience.

#### 2. File Inventory
- **Create**: `packages/studio/src/components/Toast/HotReloadToast.tsx`
- **Modify**:
  - `packages/studio/src/context/StudioContext.tsx`
- **Read-Only**: `README.md`

#### 3. Implementation Spec
- **Architecture**: We will hook into Vite's injected HMR client (`import.meta.hot`) to listen for update events, or listen to player reload events, and trigger a temporary toast notification using the existing `useToast` hook.
- **Pseudo-Code**:
  - In `StudioContext.tsx` (or a dedicated hook), add an effect that listens to HMR updates.
  - When an update event fires, call `addToast('Composition reloaded', 'success')`.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Start the dev server (`npm run dev -w packages/studio`), open the studio, modify a composition file, and verify a toast appears.
- **Success Criteria**: A temporary visual indicator appears upon successful hot reload.
- **Edge Cases**: Ensure the indicator doesn't spam on rapid successive saves.
