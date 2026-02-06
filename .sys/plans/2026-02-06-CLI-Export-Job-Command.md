# 2026-02-06-CLI-Export-Job-Command

## 1. Context & Goal
- **Objective**: Implement a `helios export-job` command that generates a JSON job specification for distributed rendering.
- **Trigger**: The V2 vision requires "Distributed Rendering suitable for cloud execution" with "Stateless workers". The current `RenderOrchestrator` is tightly coupled to local execution.
- **Impact**: Unlocks the ability to implement external/cloud orchestration adapters (e.g., AWS Batch) by decoupling the "Planning" (job splitting) from the "Execution".

## 2. File Inventory
- **Create**: `packages/cli/src/commands/export-job.ts` (New command implementation)
- **Modify**: `packages/cli/src/index.ts` (Register the new command)
- **Read-Only**: `packages/cli/src/commands/render.ts` (Reference for option parsing), `packages/renderer/src/Orchestrator.ts` (Reference for chunk calculation logic)

## 3. Implementation Spec
- **Architecture**:
  - Create a new Commander.js command `export-job`.
  - It accepts similar arguments to `render` (input, output, fps, duration, width, height) plus `--shards` (to define split count).
  - It calculates the total frames and splits them into chunks (mirroring `RenderOrchestrator` logic).
  - It outputs a JSON file to stdout (or a file if specified) containing the job metadata and the list of chunks.

- **Pseudo-Code (`export-job.ts`)**:
  ```typescript
  program.command('export-job <input>')
    .option('--output <path>', 'Output path for the final video (used for naming chunks)', 'output.mp4')
    .option('--shards <number>', 'Number of chunks to split into', '1')
    .option('--width <number>', '1920')
    .option('--height <number>', '1080')
    .option('--fps <number>', '30')
    .option('--duration <number>', '1')
    .action(async (input, options) => {
      // 1. Resolve Input URL (file:// or http://)
      // 2. Resolve Output Path
      // 3. Calculate Total Frames (from duration * fps)
      // 4. Calculate Chunk Size (ceil(total / shards))
      // 5. Generate Chunk List:
      //    For i in 0..shards:
      //      start = i * chunkSize
      //      count = min(chunkSize, remaining)
      //      // Mirror RenderOrchestrator temp file naming (simplified)
      //      chunkOutput = output_dir + / + temp_prefix + _part_ + i + .mov
      // 6. Construct Job JSON:
      //    {
      //      jobId: randomString(),
      //      composition: inputUrl,
      //      output: outputPath,
      //      renderOptions: { width, height, fps, ... },
      //      chunks: [ { id: i, startFrame, frameCount, output: chunkOutput } ... ]
      //    }
      // 7. Write JSON to stdout (console.log)
    })
  ```

- **Public API Changes**:
  - New CLI command: `helios export-job`

- **Dependencies**:
  - No external dependencies (use `Math.random` for IDs).

## 4. Test Plan
- **Verification**:
  - Run `helios export-job examples/basic/composition.html --shards 4 --duration 2 --fps 30`
  - Verify output is valid JSON.
  - Verify JSON contains 4 chunks.
  - Verify chunk frame ranges cover the full duration (0-60 frames).
  - Verify chunk filenames follow the pattern.

- **Success Criteria**:
  - Command runs without error.
  - Output JSON accurately reflects the split logic used by `RenderOrchestrator`.

- **Edge Cases**:
  - `shards` = 1.
  - `shards` > `totalFrames`.
