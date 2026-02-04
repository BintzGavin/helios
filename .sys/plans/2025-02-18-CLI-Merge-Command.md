# CLI: Implement Merge Command

## 1. Context & Goal
- **Objective**: Implement `helios merge` command to stitch multiple video files into a single output without re-encoding.
- **Trigger**: Vision gap. AGENTS.md requires distributed rendering support ("Output stitching without re-encoding"). While the renderer supports concatenation via `concatenateVideos`, the CLI lacks a command to expose this, rendering distributed workflows incomplete.
- **Impact**: Enables users to stitch rendering chunks (produced by distributed workers) into a final video using the standard CLI.

## 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/merge.ts`: New command implementation.
- **Modify**:
  - `packages/cli/src/index.ts`: Register the new merge command.
- **Read-Only**:
  - `packages/renderer/src/concat.ts`: Reference for the underlying API.

## 3. Implementation Spec
- **Architecture**:
  - Use Commander.js `command('merge <output> [inputs...]')` to accept variadic inputs.
  - Import `concatenateVideos` from `@helios-project/renderer`.
  - Pass inputs and output to the renderer function.
  - Handle errors gracefully using try/catch and `process.exit(1)`.
- **Pseudo-Code**:
  ```typescript
  program
    .command('merge <output> [inputs...]')
    .description('Merge multiple video files into one')
    .action(async (output, inputs) => {
      try {
        if (!inputs || inputs.length === 0) {
            throw new Error("No input files provided.");
        }
        await concatenateVideos(inputs, output);
        log("Merge complete.");
      } catch (e) {
        logError(e);
        exit(1);
      }
    })
  ```
- **Public API Changes**:
  - New CLI command: `helios merge`
- **Dependencies**:
  - `@helios-project/renderer` (already a dependency).

## 4. Test Plan
- **Verification**:
  1. Render two short clips using `helios render` (requires `ffmpeg` and local setup):
     ```bash
     helios render examples/simple-animation/composition.html -o chunk1.mp4 --start-frame 0 --frame-count 30
     helios render examples/simple-animation/composition.html -o chunk2.mp4 --start-frame 30 --frame-count 30
     ```
  2. Run merge:
     ```bash
     helios merge complete.mp4 chunk1.mp4 chunk2.mp4
     ```
  3. Verify `complete.mp4` exists and file size is consistent with the sum of chunks.
- **Success Criteria**:
  - Command executes without error.
  - Output file is created.
  - Error is thrown if no inputs are provided.
