# 2025-05-25-CLI-Render-Emit-Job.md

## 1. Context & Goal
- **Objective**: Implement the `--emit-job <file>` flag in `helios render` to generate a distributed rendering job specification without executing it.
- **Trigger**: Vision gap in "Distributed Rendering". The current `RenderOrchestrator` tightly couples planning and execution, blocking external/cloud orchestration.
- **Impact**: Enables "Stateless Worker" architecture by allowing the CLI to define the job structure (chunks, merge steps) which can then be executed by any runner (local, CI, Cloud Lambda).

## 2. File Inventory
- **Modify**: `packages/cli/src/commands/render.ts` (Add flags and planning logic)
- **Read-Only**: `packages/renderer/src/Orchestrator.ts` (Reference for chunk calculation logic)

## 3. Implementation Spec
- **Architecture**:
  - Add optional flags to `render` command: `--emit-job <file>`, `--audio-codec <codec>`, `--video-codec <codec>`.
  - In the action handler, if `--emit-job` is present:
    - **Skip** calling `RenderOrchestrator.render`.
    - **Calculate** partitions based on `totalFrames` (from duration/fps) and `concurrency` (used here as "split count").
    - **Generate** a JSON Job Spec containing:
      - `jobId`: A unique identifier (UUID or timestamp-random).
      - `config`: Global render options (url, width, height, fps, etc.).
      - `partitions`: Array of chunk definitions, each containing:
        - `id`: Partition index.
        - `startFrame`: Start frame for this chunk.
        - `frameCount`: Number of frames.
        - `outputFile`: Predicted output filename (e.g., `part_0.mov`).
        - `command`: A fully constructed `helios render` command string to execute this chunk (e.g., `helios render <url> --start-frame 0 ...`).
      - `merge`: Definition for the merge step:
        - `command`: A `helios merge` command string to stitch the chunks.
    - **Write** the JSON to the specified file.
    - **Log** success and exit.

- **Pseudo-Code**:
  ```typescript
  // In action(input, options):
  if (options.emitJob) {
    const totalFrames = options.frameCount || Math.ceil(options.duration * options.fps);
    const concurrency = options.concurrency || 1;
    const chunkSize = Math.ceil(totalFrames / concurrency);

    const partitions = [];
    const chunkFiles = [];

    for (let i = 0; i < concurrency; i++) {
      const start = (options.startFrame || 0) + (i * chunkSize);
      const count = Math.min(chunkSize, totalFrames - (i * chunkSize));
      if (count <= 0) break;

      const chunkOutput = `chunk_${i}.mov`; // simplified
      chunkFiles.push(chunkOutput);

      const cmd = `helios render "${input}" --start-frame ${start} --frame-count ${count} -o "${chunkOutput}" ...`; // inherit other flags

      partitions.push({ id: i, startFrame: start, frameCount: count, outputFile: chunkOutput, command: cmd });
    }

    const job = {
      config: { ...options, input },
      partitions,
      merge: {
        command: `helios merge "${options.output}" ${chunkFiles.join(' ')}`
      }
    };

    fs.writeFileSync(options.emitJob, JSON.stringify(job, null, 2));
    return;
  }
  // ... existing execution logic
  ```

- **Public API Changes**:
  - New CLI flag: `--emit-job <file>`.
  - New CLI flags: `--audio-codec`, `--video-codec` (passed through to renderer or job spec).

- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1. Run `helios render test.html --emit-job job.json --concurrency 2 --duration 2 --fps 30`.
  2. Verify `job.json` is created.
  3. Verify `partitions` array has 2 items.
  4. Verify `partitions[0].startFrame` is 0, `frameCount` is 30.
  5. Verify `partitions[1].startFrame` is 30, `frameCount` is 30.
  6. Verify `merge.command` contains the chunk filenames.
- **Success Criteria**: CLI produces a valid JSON spec that accurately describes the split job.
