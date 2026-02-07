# Plan: Enable Portable Job Paths for Distributed Rendering

## 1. Context & Goal
- **Objective**: Ensure distributed rendering job specifications (`job.json`) use relative paths and execute in the context of the job file, enabling portability across machines and directory structures.
- **Trigger**: Currently, `helios render --emit-job` generates absolute paths, binding the job to the specific file system where it was created. This prevents "Cloud Execution" and moving jobs between machines.
- **Impact**: Unlocks true distributed rendering by allowing job artifacts to be bundled (e.g., zipped) and executed on any worker with the Helios CLI installed, satisfying the "Stateless worker architecture" prerequisite.

## 2. File Inventory
- **Modify**: `packages/cli/src/commands/render.ts` (Calculate relative paths for `input`, `output`, and chunks)
- **Modify**: `packages/cli/src/commands/job.ts` (Set `cwd` to job file directory during execution)
- **Read-Only**: `packages/cli/src/types/job.ts`

## 3. Implementation Spec
- **Architecture**:
    - The `JobSpec` generator (`render.ts`) will calculate all file paths relative to the directory where the `job.json` is being saved.
    - The `JobExecutor` (`job.ts`) will set the `cwd` (Current Working Directory) of the spawned child processes (`helios` commands) to the directory containing the `job.json` file.
    - This ensures that relative paths in the `command` strings are resolved correctly relative to the job file, regardless of where `helios job run` is invoked from.

- **Pseudo-Code (render.ts)**:
    - Get absolute `jobPath` from options.
    - Get absolute `jobDir` = `dirname(jobPath)`.
    - Get absolute `outputPath`, `inputPath`.
    - Calculate `relInput` = `path.relative(jobDir, inputPath)`.
    - Calculate `relOutput` = `path.relative(jobDir, outputPath)`.
    - For each chunk:
        - `chunkFilename` = `basename(outputName) + part + ext`.
        - `chunkPath` = `join(dirname(relOutput), chunkFilename)`. (Keep it relative!)
        - Construct command using `relInput` and `chunkPath`.
    - `mergeCommand`: Use `relOutput` and list of `chunkPath`s.

- **Pseudo-Code (job.ts)**:
    - `jobDir` = `path.dirname(path.resolve(file))`.
    - In `executeChunk`: `spawn(chunk.command, { ..., cwd: jobDir })`.
    - In `merge`: `spawn(jobSpec.mergeCommand, { ..., cwd: jobDir })`.

- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
    1.  Create a test directory `test-job-dist`.
    2.  Create a dummy composition file (or use an existing example).
    3.  Run `helios render <input> --emit-job test-job-dist/job.json`.
    4.  Inspect `test-job-dist/job.json`: Verify paths are relative (e.g., no `/Users/...`).
    5.  Run `helios job run test-job-dist/job.json`.
    6.  Verify output files are created in `test-job-dist/` (or wherever relative path points).
- **Success Criteria**:
    - `job.json` contains no absolute paths for input/output.
    - `helios job run` successfully renders when run from a directory *other than* the job directory.
- **Edge Cases**:
    - Input file in parent directory (`../input.html`).
    - Output file in different subdirectory.
