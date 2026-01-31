# Context & Goal
- **Objective**: Persist render job history to disk to ensure job status and history survive server restarts.
- **Trigger**: Vision gap. "Renders Panel - Track rendering progress and manage render jobs". Current reality is ephemeral in-memory storage, losing history on every dev server restart.
- **Impact**: Improves Studio UX by providing a reliable history of renders. Allows users to "manage" jobs (delete, retry logic in future) across sessions.

# File Inventory
- **Modify**: `packages/studio/src/server/render-manager.ts` (Implement save/load logic)
- **Read-Only**: `packages/studio/src/server/discovery.ts` (Check `getProjectRoot` usage)

# Implementation Spec
- **Architecture**:
  - Introduce a persistent JSON store (`renders/jobs.json`) in the project root.
  - On module initialization, load jobs from this file.
  - During load, mark any `rendering` or `queued` jobs as `failed` (since the process is gone).
  - Update `saveJobs` helper to write the `jobs` Map to disk (synchronously for safety/simplicity).
  - Call `saveJobs` in `startRender`, `cancelJob`, `deleteJob`, and the render completion/failure callback.

- **Pseudo-Code**:
  ```typescript
  const JOBS_FILE = 'jobs.json'; // Inside rendersDir

  // Helper to resolve path
  function getJobsFilePath() {
    return path.join(getProjectRoot(process.cwd()), 'renders', JOBS_FILE);
  }

  // Load jobs from disk
  function loadJobs() {
    const file = getJobsFilePath();
    if (fs.existsSync(file)) {
      try {
        const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
        if (Array.isArray(data)) {
           for (const job of data) {
             // Handle interrupted jobs
             if (job.status === 'rendering' || job.status === 'queued') {
                job.status = 'failed';
                job.error = 'Server restarted during render';
             }
             jobs.set(job.id, job);
           }
        }
      } catch (e) {
        console.warn('[RenderManager] Failed to load jobs history:', e);
      }
    }
  }

  // Save jobs to disk
  function saveJobs() {
    const file = getJobsFilePath();
    const rendersDir = path.dirname(file);
    if (!fs.existsSync(rendersDir)) {
      fs.mkdirSync(rendersDir, { recursive: true });
    }

    try {
      const jobList = Array.from(jobs.values());
      fs.writeFileSync(file, JSON.stringify(jobList, null, 2));
    } catch (e) {
      console.error('[RenderManager] Failed to save jobs history:', e);
    }
  }

  // Initialize immediately
  loadJobs();

  // In startRender:
  // ...
  jobs.set(jobId, job);
  saveJobs(); // Persist initial state

  // ... inside async render loop:
  // onProgress:
  //   job.progress = p;
  //   // Optimization: Don't save on every frame progress, maybe throttled?
  //   // Or just don't save progress to disk, only status?
  //   // Vision says "Track rendering progress", but restarting server loses progress anyway.
  //   // Let's NOT save on every progress tick to avoid IO thrashing.
  //   // Only save on status change.

  // onComplete:
  job.status = 'completed';
  saveJobs();

  // onFail:
  job.status = 'failed';
  saveJobs();

  // In cancelJob:
  job.status = 'cancelled';
  saveJobs();

  // In deleteJob:
  jobs.delete(id);
  saveJobs();
  ```

- **Dependencies**: None. Uses existing `fs` and `path`.

# Test Plan
- **Verification**:
  1. Run `npm test -w packages/studio` to verify no regressions in existing tests.
  2. Manual verification:
     - Run `npx helios studio`.
     - Start a render job.
     - While rendering, stop the server (Ctrl+C).
     - Restart the server.
     - Verify the job is listed as `failed` (Server restarted).
     - Start another job, let it finish.
     - Restart server.
     - Verify the completed job is still listed.
     - Delete the job.
     - Restart server.
     - Verify it is gone.
- **Success Criteria**: `renders/jobs.json` is created and maintained. UI reflects persistent state.
