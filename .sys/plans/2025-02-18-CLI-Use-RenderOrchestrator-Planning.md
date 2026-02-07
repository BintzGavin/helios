# 2025-02-18-CLI-Use-RenderOrchestrator-Planning

#### 1. Context & Goal
- **Objective**: Refactor `helios render --emit-job` to use `RenderOrchestrator.plan()` for generating distributed job specifications.
- **Trigger**: Vision Gap - Distributed rendering logic currently duplicates and diverges from the core `RenderOrchestrator` logic, leading to potential inconsistencies in chunking and file handling.
- **Impact**: Ensures that distributed jobs use the same planning logic (chunk size calculation, temp file naming, audio strategy) as local rendering, improving reliability and maintainability. This is a prerequisite for advanced distributed rendering features (like sophisticated audio mixing) to work correctly.

#### 2. File Inventory
- **Modify**: `packages/cli/src/commands/render.ts` (Replace manual chunking logic with `RenderOrchestrator.plan()`)
- **Read-Only**: `packages/renderer/src/Orchestrator.ts` (Reference for `plan()` return type and logic)

#### 3. Implementation Spec
- **Architecture**:
  - The CLI will delegate the calculation of render chunks to `RenderOrchestrator.plan()`.
  - It will then map the returned `RenderPlan` (which contains `RenderChunk[]`) to the `JobSpec` (which requires `RenderJobChunk[]` with command strings).
  - A helper function `rendererOptionsToFlags(options: RendererOptions): string` will be implemented to serialize `RendererOptions` back into CLI arguments for the worker commands.

- **Pseudo-Code**:
  ```typescript
  // In render.ts action handler
  const options = parseOptions(...);

  if (emitJob) {
    // Delegate planning to the core renderer
    const plan = RenderOrchestrator.plan(url, outputPath, options);

    // Helper to convert options back to CLI flags
    const rendererOptionsToFlags = (opts: RendererOptions) => {
      // Implement mapping:
      // opts.width -> --width
      // opts.height -> --height
      // opts.fps -> --fps
      // opts.audioCodec -> --audio-codec
      // opts.videoCodec -> --video-codec
      // opts.crf -> --quality
      // opts.mode -> --mode
      // opts.browserConfig.headless -> --no-headless (if false)
      // etc.
      // Returns string
    };

    // Map plan to job spec
    const chunks = plan.chunks.map(chunk => ({
      id: chunk.id,
      startFrame: chunk.startFrame,
      frameCount: chunk.frameCount,
      outputFile: chunk.outputFile,
      command: `helios render ${url} -o ${chunk.outputFile} --start-frame ${chunk.startFrame} --frame-count ${chunk.frameCount} ${rendererOptionsToFlags(chunk.options)}`
    }));

    // Construct merge command
    // Use plan.concatManifest (list of temp files) as inputs
    // Pass mixOptions (codecs/quality) to merge command
    let mergeCmd = `helios merge ${outputPath} ${plan.concatManifest.join(' ')}`;
    if (plan.mixOptions.videoCodec) mergeCmd += ` --video-codec ${plan.mixOptions.videoCodec}`;
    if (plan.mixOptions.audioCodec) mergeCmd += ` --audio-codec ${plan.mixOptions.audioCodec}`;
    if (plan.mixOptions.crf) mergeCmd += ` --quality ${plan.mixOptions.crf}`;

    // Note: Implicit audio mixing logic from RenderOrchestrator is not fully captured by 'helios merge' yet,
    // but basic concatenation and transcoding will work. This is acceptable for now.

    const jobSpec: JobSpec = {
      metadata: {
        totalFrames: plan.totalFrames,
        fps: options.fps,
        width: options.width,
        height: options.height,
        duration: plan.totalFrames / options.fps
      },
      chunks,
      mergeCommand: mergeCmd
    };

    writeJobSpec(emitJobPath, jobSpec);
    return;
  }
  ```

- **Dependencies**: None. `RenderOrchestrator` is already available in `@helios-project/renderer`.

#### 4. Test Plan
- **Verification**:
  - Run `helios render examples/hello-world/composition.html --emit-job job.json --concurrency 2`
  - Inspect `job.json`:
    - Ensure `chunks` has 2 entries.
    - Ensure `command` string in chunks contains correct flags (e.g., `--width`, `--height`).
    - Ensure `outputFile` in chunks matches `RenderOrchestrator`'s temp file pattern (`temp_...` or similar).
    - Ensure `mergeCommand` lists the correct temp files as inputs.
- **Success Criteria**: Generated `job.json` is valid JSON and structurally consistent with `RenderOrchestrator`'s internal logic.
- **Edge Cases**:
  - Test with `concurrency=1`.
  - Test with custom `start-frame` and `frame-count` (e.g., partial render).
