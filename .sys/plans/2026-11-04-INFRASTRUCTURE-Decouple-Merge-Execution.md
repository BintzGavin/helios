#### 1. Context & Goal
- **Objective**: Decouple the `JobExecutor` merge step from the main worker adapter to fully support cloud-based distributed rendering workflows.
- **Trigger**: Vision gap identified in memory: The `JobExecutor` currently uses the same adapter for executing chunks and the merge command. This fails for cloud adapters (AWS Lambda / Cloud Run) because the final merge step requires local access to all rendered chunks.
- **Impact**: Unblocks end-to-end distributed cloud rendering. Allows jobs to execute chunks in the cloud but delegate the final output assembly to a local adapter or a dedicated `VideoStitcher`.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/infrastructure/src/orchestrator/job-executor.ts`
  - `packages/infrastructure/tests/job-executor.test.ts`
- **Read-Only**:
  - `packages/infrastructure/src/stitcher/ffmpeg-stitcher.ts`
  - `packages/infrastructure/src/types/job-spec.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Extend `JobExecutionOptions` in `job-executor.ts` to include optional fields: `mergeAdapter?: WorkerAdapter`, `stitcher?: VideoStitcher` (import from `../stitcher/ffmpeg-stitcher.js` if needed for type), and `outputFile?: string`.
  - Modify the merge logic in `JobExecutor.execute()`:
    - If `shouldMerge` is true:
      - If `options.stitcher` and `options.outputFile` are provided, resolve the absolute paths of all chunk `outputFile`s (joined with `jobDir`) and call `await options.stitcher.stitch(inputs, output)`.
      - Else if `job.mergeCommand` is present, execute it using `options.mergeAdapter ?? this.adapter`.
      - Else, skip merging.
- **Pseudo-Code**:
  ```typescript
  // In JobExecutionOptions:
  mergeAdapter?: WorkerAdapter;
  stitcher?: VideoStitcher;
  outputFile?: string;

  // In execute() merge step:
  if (shouldMerge) {
    if (options.stitcher && options.outputFile) {
      console.log('Starting merge step using dedicated VideoStitcher...');
      const path = await import('node:path');
      const inputs = job.chunks.map(c => path.resolve(jobDir, c.outputFile));
      const output = path.resolve(jobDir, options.outputFile);
      await options.stitcher.stitch(inputs, output);
      console.log('Merge completed successfully via VideoStitcher.');
    } else if (job.mergeCommand) {
      console.log('Starting merge step via mergeCommand...');
      const mergeAdapter = options.mergeAdapter || this.adapter;
      // ... execute job.mergeCommand using mergeAdapter
    }
  }
  ```
- **Public API Changes**:
  - `JobExecutionOptions` interface is expanded to support `mergeAdapter`, `stitcher`, and `outputFile`.
- **Dependencies**: None.
- **Cloud Considerations**: Essential for cloud-native orchestration. Solves the architectural bottleneck where stateless cloud workers cannot perform the final artifact assembly.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm test -- tests/job-executor.test.ts`
- **Success Criteria**:
  - `JobExecutor` uses `mergeAdapter` instead of the main adapter when `mergeAdapter` is provided.
  - `JobExecutor` uses `stitcher.stitch()` when both `stitcher` and `outputFile` are provided, correctly mapping chunk output files to their absolute paths.
  - Backward compatibility is maintained (falls back to `this.adapter` and `job.mergeCommand` when new options are omitted).
- **Edge Cases**:
  - `stitcher` provided but `outputFile` missing: gracefully fall back to `mergeCommand` or throw a clear validation error before execution.
  - Merge failure correctly bubbles up the error.
- **Integration Verification**: Verify that the changes cleanly compile and unit tests pass without regressions.
