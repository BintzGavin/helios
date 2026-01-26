# Plan: Studio Render Job Management

## 1. Context & Goal
- **Objective**: Implement "Cancel" and "Delete" functionality for render jobs in the Studio backend and UI.
- **Trigger**: Vision gap - "Manage render jobs" is promised in the README, but currently users can only view a list of jobs without control.
- **Impact**: Enables users to stop long-running or accidental renders and clear up the job history/UI, improving the developer experience.

## 2. File Inventory
- **Modify**: `packages/studio/src/server/render-manager.ts` (Implement cancel/delete logic, manage AbortControllers)
- **Modify**: `packages/studio/vite-plugin-studio-api.ts` (Add API endpoints `POST /api/jobs/:id/cancel` and `DELETE /api/jobs/:id`)
- **Modify**: `packages/studio/src/context/StudioContext.tsx` (Add `cancelRender`, `deleteRender` to context, update types)
- **Modify**: `packages/studio/src/components/RendersPanel/RendersPanel.tsx` (Add UI buttons for Cancel/Delete)

## 3. Implementation Spec
- **Architecture**:
  - The `RenderManager` will maintain a map of `jobId -> AbortController` alongside the job data.
  - When `startRender` is called, a new `AbortController` is created and its signal passed to the `Renderer`.
  - The `Renderer` (already implemented in `packages/renderer`) respects `AbortSignal` and kills the FFmpeg process upon abortion.
  - The Vite Plugin routes HTTP requests to the `RenderManager`.
  - The Frontend (`StudioContext`) consumes these endpoints.

- **Pseudo-Code**:
  ```typescript
  // packages/studio/src/server/render-manager.ts

  const controllers = new Map<string, AbortController>();

  // In startRender:
  const controller = new AbortController();
  controllers.set(jobId, controller);

  try {
    // Pass signal to renderer
    await renderer.render(..., { signal: controller.signal });
  } catch (e) {
    if (e.message === 'Aborted') {
      job.status = 'cancelled';
    } else {
      job.status = 'failed';
    }
  } finally {
    controllers.delete(jobId);
  }

  export function cancelJob(id: string): boolean {
    const job = jobs.get(id);
    const controller = controllers.get(id);
    if (job && controller && (job.status === 'queued' || job.status === 'rendering')) {
      controller.abort();
      job.status = 'cancelled'; // Optimistic update, let catch block confirm
      return true;
    }
    return false;
  }

  export function deleteJob(id: string): boolean {
    const job = jobs.get(id);
    if (!job) return false;

    // Prevent deleting running jobs
    if (job.status === 'rendering') return false;

    jobs.delete(id);
    // Optional: Delete output file
    if (fs.existsSync(job.outputPath)) {
        fs.unlinkSync(job.outputPath);
    }
    return true;
  }
  ```

  ```typescript
  // packages/studio/vite-plugin-studio-api.ts

  // POST /api/jobs/:id/cancel
  server.middlewares.use('/api/jobs', (req, res, next) => {
     // Regex match for /api/jobs/:id/cancel
     if (match && method === 'POST') {
        const success = cancelJob(id);
        res.end(JSON.stringify({ success }));
        return;
     }

     // Regex match for /api/jobs/:id (DELETE)
     if (match && method === 'DELETE') {
        const success = deleteJob(id);
        res.end(JSON.stringify({ success }));
        return;
     }

     next();
  });
  ```

- **Public API Changes**:
  - `RenderJob` interface: Update `status` type to include `'cancelled'`.
  - Backend API:
    - `POST /api/jobs/:id/cancel`
    - `DELETE /api/jobs/:id`

- **Dependencies**:
  - Depends on `packages/renderer` accepting `signal` in `render()` method (Verified).

## 4. Test Plan
- **Verification**:
  - Start the studio dev server: `npx helios studio`.
  - **Cancel Test**:
    - Select a composition and start a render (use a long duration or high framerate).
    - While rendering, click the "Cancel" button in the Renders Panel.
    - Verify the job status updates to "cancelled".
    - Verify in the terminal that "Render aborted" or similar log appears.
    - Verify no new frames are being processed.
  - **Delete Test**:
    - Locate a completed or cancelled job.
    - Click the "Delete" (trash icon) button.
    - Verify the job is removed from the list.
    - Verify the output file is deleted from the `renders/` directory.

- **Success Criteria**:
  - Users can cancel active renders.
  - Users can delete render history.
  - UI updates reflect the state changes accurately.

- **Edge Cases**:
  - Cancelling a job that just finished naturally.
  - Deleting a job where the file was already manually deleted (should not crash).
