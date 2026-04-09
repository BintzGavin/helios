#### 1. Context & Goal
- **Objective**: Enable playback of distributed rendering output chunks directly within the Studio Renders Panel.
- **Trigger**: Studio capabilities for distributed rendering (from `docs/BACKLOG.md` and `AGENTS.md` - Studio Posture).
- **Impact**: Enhances the Studio product surface, closing the gap in managing and reviewing output from the distributed render workflow directly from the browser UI.

#### 2. File Inventory
- **Modify**: `packages/studio/src/components/RendersPanel/RendersPanel.tsx` - Add UI to display and play individual render chunks for a job.
- **Modify**: `packages/studio/src/server/render-manager.ts` - Update job state tracking to include chunk status and output URLs.
- **Modify**: `packages/studio/src/context/StudioContext.tsx` - Update `renderJobs` state and context logic to handle chunk data.

#### 3. Implementation Spec
- **Architecture**: Extend the existing render jobs state management (managed via `useStudio` and the `renderJobs` array) to include chunk information provided by the backend. The backend `RenderManager` needs to surface intermediate chunk URLs as they complete. Update the `RendersPanel` UI to iterate over these chunks, if present, providing a "Preview" button for each using the existing `setPreviewUrl` mechanism.
- **Pseudo-Code**:
  ```typescript
  // RendersPanel.tsx
  // Inside the job mapping:
  {job.chunks && job.chunks.map(chunk => (
     <div key={chunk.id}>
        <span>{chunk.id}</span>
        {chunk.outputUrl && <button onClick={() => setPreviewUrl(chunk.outputUrl)}>Preview</button>}
     </div>
  ))}
  ```
- **Public API Changes**: Enhance the backend render manager state returned to the Studio frontend to include chunk metadata alongside overall job progress.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npx helios studio` and trigger a render job.
- **Success Criteria**: The Renders Panel displays individual chunks updating in real-time, and clicking "Preview" on a completed chunk successfully plays the video segment.
- **Edge Cases**: Verify behavior when chunks fail, and ensure layout handles many chunks gracefully.