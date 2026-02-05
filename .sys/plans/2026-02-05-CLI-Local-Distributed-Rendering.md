# CLI: Local Distributed Rendering

## 1. Context & Goal
- **Objective**: Enable local distributed rendering in the `helios render` command by adding a `--concurrency` flag and utilizing the `RenderOrchestrator` from `@helios-project/renderer`.
- **Trigger**: The V2 vision mandates distributed rendering support. Currently, the CLI only supports single-threaded rendering (via `Renderer`). The `RenderOrchestrator` logic exists in the renderer package but is not exposed via the CLI.
- **Impact**: This unlocks faster local rendering for users with multi-core machines by splitting the render job into concurrent chunks and stitching them together. It bridges the gap between local and distributed workflows.

## 2. File Inventory
- **Modify**: `packages/cli/package.json` (Update dependency version to access Orchestrator)
- **Modify**: `packages/cli/src/commands/render.ts` (Implement concurrency flag and switch to Orchestrator)

## 3. Implementation Spec

### Architecture
The `helios render` command will be updated to accept a `--concurrency` argument. Instead of directly instantiating the `Renderer` class, it will delegate execution to `RenderOrchestrator.render`. The `RenderOrchestrator` handles splitting the job into chunks (if concurrency > 1), running them in parallel, and stitching the results.

### Pseudo-Code
```typescript
// packages/cli/src/commands/render.ts

// 1. Import Orchestrator
import { RenderOrchestrator, DistributedRenderOptions } from '@helios-project/renderer';

// ... inside registerRenderCommand ...

// 2. Add Option
program
  .command('render <input>')
  // ... existing options ...
  .option('--concurrency <number>', 'Number of concurrent render workers', '1');

// ... inside action ...

// 3. Parse Concurrency
const concurrency = parseInt(options.concurrency, 10);
if (isNaN(concurrency) || concurrency < 1) {
  throw new Error('concurrency must be a valid number >= 1');
}

// 4. Construct Options
const renderOptions: DistributedRenderOptions = {
  width: parseInt(options.width, 10),
  height: parseInt(options.height, 10),
  fps: parseInt(options.fps, 10),
  durationInSeconds: parseInt(options.duration, 10),
  crf: options.quality ? parseInt(options.quality, 10) : undefined,
  mode: options.mode as 'canvas' | 'dom',
  startFrame,
  frameCount,
  browserConfig: {
    headless: options.headless,
  },
  concurrency, // New option
};

// 5. Execute via Orchestrator
console.log(`Starting render with concurrency: ${concurrency}`);
await RenderOrchestrator.render(url, outputPath, renderOptions);
```

### Public API Changes
- New CLI Option: `helios render --concurrency <N>`

### Dependencies
- `@helios-project/renderer` must export `RenderOrchestrator` (Available in v1.69.0).
- `packages/cli/package.json` must update `@helios-project/renderer` dependency to `workspace:*` (or `^1.69.0`) to ensure types and exports are resolved correctly from the monorepo.

## 4. Test Plan
- **Verification**:
  1.  Run `helios render examples/simple-canvas-animation --concurrency 2 -o output.mp4`.
  2.  Observe console logs for `[Worker 0]` and `[Worker 1]` entries.
  3.  Verify `output.mp4` is created and plays correctly.
- **Success Criteria**:
  - Render completes without error.
  - Multiple workers are spawned (evidenced by logs).
  - Final video output is valid.
- **Edge Cases**:
  - `concurrency=1`: Should behave identical to standard render.
  - `concurrency=4` (on 2-core machine): Should still work (Orchestrator handles scheduling).
  - Invalid inputs for concurrency (handled by parsing logic).
