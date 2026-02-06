## 1. Context & Goal
- **Objective**: Decouple `RenderOrchestrator` from the concrete `Renderer` class by introducing a `RenderExecutor` interface, enabling pluggable execution strategies (e.g., Cloud/Lambda) for distributed rendering.
- **Trigger**: V2 Vision requirement "Distributed Rendering suitable for cloud execution". Current `Orchestrator` is hardcoded to local `Renderer` instances.
- **Impact**: Unlocks the ability to implement `CloudExecutor` in the future without modifying the core orchestration logic, facilitating the transition to a distributed video platform.

## 2. File Inventory
- **Create**:
  - `packages/renderer/src/executors/RenderExecutor.ts`: Interface definition for render executors.
  - `packages/renderer/src/executors/LocalExecutor.ts`: Default implementation wrapping the local `Renderer`.
- **Modify**:
  - `packages/renderer/src/Orchestrator.ts`: Update to use `RenderExecutor` interface and accept an optional executor instance.
  - `packages/renderer/src/index.ts`: Export new executor types.
- **Read-Only**:
  - `packages/renderer/src/Renderer.ts`: Referenced by `LocalExecutor`.
  - `packages/renderer/src/types.ts`: Referenced for types.

## 3. Implementation Spec
- **Architecture**: Use the **Strategy Pattern** to encapsulate the execution logic of render chunks. `RenderOrchestrator` will act as the context, using a `RenderExecutor` strategy to process each chunk.
- **Pseudo-Code**:
  ```typescript
  // src/executors/RenderExecutor.ts
  import { RendererOptions, RenderJobOptions } from '../types.js';

  export interface RenderExecutor {
    render(compositionUrl: string, outputPath: string, options: RendererOptions, jobOptions?: RenderJobOptions): Promise<void>;
  }

  // src/executors/LocalExecutor.ts
  import { RenderExecutor } from './RenderExecutor.js';
  import { Renderer } from '../Renderer.js';
  import { RendererOptions, RenderJobOptions } from '../types.js';

  export class LocalExecutor implements RenderExecutor {
    async render(compositionUrl: string, outputPath: string, options: RendererOptions, jobOptions?: RenderJobOptions): Promise<void> {
      const renderer = new Renderer(options);
      await renderer.render(compositionUrl, outputPath, jobOptions);
    }
  }

  // src/Orchestrator.ts
  import { RenderExecutor } from './executors/RenderExecutor.js';
  import { LocalExecutor } from './executors/LocalExecutor.js';

  export interface DistributedRenderOptions extends RendererOptions {
    concurrency?: number;
    executor?: RenderExecutor; // New option
  }

  export class RenderOrchestrator {
    static async render(compositionUrl: string, outputPath: string, options: DistributedRenderOptions, jobOptions?: RenderJobOptions): Promise<void> {
      // ... setup ...

      const executor = options.executor || new LocalExecutor();

      // ... loop ...

      // Use executor instead of direct Renderer instantiation
      const promise = executor.render(compositionUrl, tempFile, workerJobOptions)
        .catch(err => {
          // Abort logic remains the same
          // ...
        });

      // ...
    }
  }
  ```
- **Public API Changes**:
  - `DistributedRenderOptions` gains an optional `executor` property.
  - New exports: `RenderExecutor` (interface), `LocalExecutor` (class).
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npx tsx tests/verify-orchestrator-executor.ts`
  - Create `tests/verify-orchestrator-executor.ts` that implements a `MockExecutor` (logging calls instead of rendering).
  - Execute `RenderOrchestrator.render` with the mock and verify it is called `concurrency` times.
  - Run `npm test` to ensure existing distributed rendering (using `LocalExecutor` default) continues to work.
- **Success Criteria**:
  - `verify-orchestrator-executor.ts` passes (mock receives correct calls).
  - `verify-distributed.ts` passes (local rendering functionality preserved).
- **Edge Cases**:
  - Verify error propagation from the executor still triggers abort in Orchestrator.
