# 📋 STUDIO: Render Preview

## 1. Context & Goal
- **Objective**: Implement a modal to preview rendered videos directly within the Studio UI.
- **Trigger**: "Renders Panel" lacks an instant review mechanism, forcing users to download files to view them. This closes a gap in the "Browser-based development environment" vision.
- **Impact**: Improves the feedback loop for server-side renders, making the Studio a more complete IDE.

## 2. File Inventory
- **Create**:
  - `packages/studio/src/components/RenderPreviewModal.tsx`: The modal component.
  - `packages/studio/src/components/RenderPreviewModal.css`: Styles for the modal, following `DiagnosticsModal` pattern.
- **Modify**:
  - `packages/studio/src/context/StudioContext.tsx`: Add state for `previewUrl` (string | null).
  - `packages/studio/src/App.tsx`: Mount the `RenderPreviewModal`.
  - `packages/studio/src/components/RendersPanel/RendersPanel.tsx`: Add "Play" button to completed jobs.
- **Read-Only**:
  - `packages/studio/src/server/render-manager.ts`: Reference for `outputUrl` generation.
  - `packages/studio/src/components/DiagnosticsModal.tsx`: Reference for modal structure.

## 3. Implementation Spec
- **Architecture**:
  - Use `StudioContext` to manage the global `previewUrl` state.
  - `RenderPreviewModal` component listens to `previewUrl`.
  - If `previewUrl` is set, it renders a modal overlay containing a `<video>` player.
  - The video source is the `previewUrl` (e.g., `/api/renders/render-123.mp4`), which is served by the Studio backend.
- **Pseudo-Code**:
  - **StudioContext**:
    - Add `previewUrl` state and `setPreviewUrl` function.
    - Expose these in `StudioContextType`.
  - **RenderPreviewModal**:
    - Import `useStudio`.
    - If `!previewUrl` return null.
    - Render overlay (`.preview-modal-overlay`) with click-to-close.
    - Render content (`.preview-modal`) containing:
      - Header with "Preview" and Close button.
      - `<video controls autoPlay src={previewUrl} />`.
  - **RendersPanel**:
    - In the job list rendering logic:
    - If `job.status === 'completed'` and `job.outputUrl` exists:
      - Render a "Play" button (e.g., `▶ Preview`).
      - OnClick: `setPreviewUrl(job.outputUrl)`.

## 4. Test Plan
- **Verification**:
  1. Start Studio: `npx helios studio`.
  2. Create a simple composition (if none exists).
  3. Start a server-side render (short duration, e.g., 2 seconds).
  4. Wait for completion.
  5. Click the new "Preview" button in the Renders Panel.
  6. **Success Criteria**: A modal appears playing the video.
  7. Close the modal (via X or clicking overlay).
  8. **Success Criteria**: Modal disappears and video stops.
- **Edge Cases**:
  - Ensure video stops playing when modal closes (React unmount handles this).
  - Verify layout on small screens (video should resize).
