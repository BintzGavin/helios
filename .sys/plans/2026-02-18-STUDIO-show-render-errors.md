#### 1. Context & Goal
- **Objective**: Display detailed error messages in the Renders Panel when a render job fails.
- **Trigger**: The current `RendersPanel` implementation displays a generic "Failed" status without showing the underlying error message from `render-manager.ts`, making diagnosis impossible.
- **Impact**: Unlocks the ability for users to debug render failures (e.g., FFmpeg errors, missing assets) directly within the Studio, aligning with the vision of a "Track rendering progress" panel.

#### 2. File Inventory
- **Modify**: `packages/studio/src/components/RendersPanel/RendersPanel.tsx` (Add error display UI)
- **Modify**: `packages/studio/src/components/RendersPanel/RendersPanel.css` (Add styles for error messages)
- **Read-Only**: `packages/studio/src/context/StudioContext.tsx` (Reference `RenderJob` interface)

#### 3. Implementation Spec
- **Architecture**: Update `RendersPanel.tsx` to conditionally render the `job.error` property when `job.status` is `'failed'`.
- **UI Design**: Use a collapsible or constrained text block to display the error message to avoid cluttering the job list.
- **Pseudo-Code**:
  ```tsx
  if (job.status === 'failed') {
    return (
      <div className="render-job-failed">
        <span className="status-failed">Failed</span>
        {job.error && (
           <details className="error-details">
             <summary>Show Error</summary>
             <pre>{job.error}</pre>
           </details>
        )}
      </div>
    )
  }
  ```

#### 4. Test Plan
- **Verification**: Run `npm run verify` (which runs `scripts/verify-ui.ts`) to ensure the UI still loads correctly and no regressions were introduced.
- **Success Criteria**: The `RendersPanel.tsx` file contains logic to render `job.error`.
- **Edge Cases**: Ensure long error messages wrap correctly and do not break the layout.
