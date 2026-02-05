# 2026-09-09-CLI-Render-Concurrency.md

#### 1. Context & Goal
- **Objective**: Implement the `--concurrency` flag in `helios render` to enable local distributed rendering using `RenderOrchestrator`.
- **Trigger**: Vision gap. The CLI is documented to support distributed rendering, but the current implementation uses the single-process `Renderer` class, ignoring multi-core potential.
- **Impact**: Unlocks significantly faster rendering speeds on local machines by utilizing multiple CPU cores, fulfilling a key V2 architectural requirement for distributed execution.

#### 2. File Inventory
- **Modify**: `packages/cli/src/commands/render.ts` (Update action handler to use `RenderOrchestrator`)
- **Read-Only**: `packages/renderer/src/Orchestrator.ts` (Reference for API signature)

#### 3. Implementation Spec
- **Architecture**:
  - The `render` command currently instantiates `Renderer` directly.
  - We will replace this with `RenderOrchestrator.render()`, which handles both single-process (concurrency=1) and multi-process rendering transparently.
  - We will add a new CLI option `--concurrency <number>` to the command definition.
- **Pseudo-Code**:
  ```typescript
  import { RenderOrchestrator } from '@helios-project/renderer';

  // ... inside action handler ...

  // Parse concurrency
  const concurrency = options.concurrency ? parseInt(options.concurrency, 10) : 1;
  if (isNaN(concurrency)) throw new Error('Invalid concurrency');

  // Construct options object matching DistributedRenderOptions
  const renderOptions = {
    // ... map existing width, height, fps, etc ...
    concurrency,
    // ...
  };

  // Delegate to Orchestrator
  await RenderOrchestrator.render(url, outputPath, renderOptions);
  ```
- **Public API Changes**:
  - `helios render` gains a new optional flag: `--concurrency <number>` (defaults to 1).
- **Dependencies**:
  - `@helios-project/renderer` (already a dependency, exports `RenderOrchestrator`).

#### 4. Test Plan
- **Verification**:
  1. Build dependencies and CLI: `npm run build -w packages/renderer && npm run build -w packages/studio && npm run build -w packages/cli`
  2. Run a render with concurrency: `node packages/cli/bin/helios.js render examples/react-hello-world --concurrency 2`
  3. Observe logs for "Starting distributed render with concurrency: 2".
  4. Verify the output video file exists and plays correctly.
- **Success Criteria**:
  - The command accepts the flag.
  - The orchestration log message appears.
  - The final video is generated successfully.
- **Edge Cases**:
  - `concurrency` is not a number (should fail gracefully).
  - `concurrency` is 1 (should behave like standard render).
