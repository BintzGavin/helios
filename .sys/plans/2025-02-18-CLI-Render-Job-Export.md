# 2025-02-18-CLI-Render-Job-Export

## 1. Context & Goal
- **Objective**: Enable external distributed rendering orchestration by adding an `--emit-job` flag to `helios render`.
- **Trigger**: Vision gap in "Distributed Rendering" (Cloud execution adapter is incubating/missing).
- **Impact**: Unlocks the ability for users and external systems (CI/CD, Cloud) to execute distributed renders by decoupling the "planning" phase from the "execution" phase.

## 2. File Inventory
- **Modify**: `packages/cli/src/commands/render.ts` (Add flags and job generation logic)
- **Read-Only**: `packages/renderer/src/Orchestrator.ts` (Reference for splitting logic), `packages/renderer/src/types.ts` (Reference for options)

## 3. Implementation Spec
- **Architecture**:
  - Add `--emit-job <file>` option to `render` command.
  - Add `--audio-codec <codec>` and `--video-codec <codec>` options to `render` command to allow fine-grained control for split chunks (parity with `RendererOptions`).
  - When `--emit-job` is present:
    - Skip immediate execution.
    - Calculate chunks based on `--concurrency` (treated as split count).
    - Generate a JSON Job Spec containing:
      - Global metadata (input, output, fps, duration).
      - List of chunks, each with:
        - `id`, `startFrame`, `frameCount`.
        - `outputFile` (auto-generated pattern: `[output_basename]_part_[id].[ext]`).
        - `command`: A fully formed `helios render` command string to execute this chunk.
      - `mergeCommand`: A fully formed `helios merge` command string to stitch chunks.
    - Write JSON to disk.

- **Pseudo-Code**:
  ```typescript
  // In action(input, options):
  if (options.emitJob) {
    // 1. Calculate totals (frames, duration)
    // 2. Loop concurrency times:
    //    chunkSize = ceil(totalFrames / concurrency)
    //    start = i * chunkSize
    //    count = min(chunkSize, total - start)
    //    Generate chunk output path
    //    Generate chunk command (inheriting all relevant flags + start/count)
    // 3. Generate merge command (output + all chunk paths)
    // 4. Write to options.emitJob
    // 5. Exit
  }
  // ... existing execution logic ...
  ```

- **Public API Changes**:
  - New CLI flags: `--emit-job`, `--audio-codec`, `--video-codec`.

- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1. Create a dummy composition (or use existing example).
  2. Run `helios render <input> -o final.mp4 --concurrency 4 --emit-job job.json`.
  3. Verify `job.json` exists.
  4. Verify `job.json` has 4 chunks.
  5. Verify chunk 0 starts at 0, chunk 1 starts at correct offset.
  6. Verify `mergeCommand` lists all 4 chunk files.
- **Success Criteria**: The CLI produces a valid JSON file that describes a distributed render without executing it.
- **Edge Cases**:
  - `concurrency` 1 (should produce 1 chunk).
  - `frame-count` not divisible by concurrency (last chunk should have remainder).
  - Explicit codecs passed (should appear in chunk commands).
