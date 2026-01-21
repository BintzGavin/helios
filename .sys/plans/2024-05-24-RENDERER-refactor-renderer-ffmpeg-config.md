# Plan: Delegate FFmpeg Configuration and Extract Types

## 1. Context & Goal
- **Objective**: Decouple FFmpeg configuration from the `Renderer` class by moving argument generation into the `RenderStrategy`, and extract `RendererOptions` to a separate file to prevent circular dependencies.
- **Trigger**: The Vision requires a "High-Performance Canvas Path" using WebCodecs (`VideoEncoder`), which outputs encoded video chunks instead of raw images. The current `Renderer` class hardcodes `image2pipe` arguments. Additionally, a circular dependency exists between `Renderer` and its strategies regarding `RendererOptions`.
- **Impact**: This refactor unblocks the future implementation of the WebCodecs strategy and improves code maintainability by resolving the dependency cycle.

## 2. File Inventory
- **Create**: `packages/renderer/src/types.ts`
  - Move `RendererOptions` interface here.
- **Modify**: `packages/renderer/src/strategies/RenderStrategy.ts`
  - Import `RendererOptions` from `../types`.
  - Add `getFFmpegArgs(options: RendererOptions, outputPath: string): string[]` to the interface.
- **Modify**: `packages/renderer/src/strategies/CanvasStrategy.ts`
  - Import `RendererOptions` from `../types`.
  - Implement `getFFmpegArgs` returning the standard `image2pipe` configuration.
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts`
  - Import `RendererOptions` from `../types`.
  - Implement `getFFmpegArgs` returning the standard `image2pipe` configuration.
- **Modify**: `packages/renderer/src/index.ts`
  - Import `RendererOptions` from `./types`.
  - Remove `RendererOptions` definition (moved).
  - Remove hardcoded `args` array.
  - Call `this.strategy.getFFmpegArgs(this.options, outputPath)`.

## 3. Implementation Spec
- **Architecture**:
  - **Shared Types**: Isolate shared data structures (`RendererOptions`) in `types.ts` to allow both `Renderer` (Context) and Strategies to depend on them without depending on each other.
  - **Strategy Pattern**: `Renderer` delegates FFmpeg configuration to `RenderStrategy`.
- **Pseudo-Code**:
  ```typescript
  // packages/renderer/src/types.ts
  export interface RendererOptions {
    width: number;
    height: number;
    fps: number;
    durationInSeconds: number;
    mode?: 'canvas' | 'dom';
  }

  // packages/renderer/src/strategies/RenderStrategy.ts
  import { RendererOptions } from '../types';
  export interface RenderStrategy {
    getFFmpegArgs(options: RendererOptions, outputPath: string): string[];
    capture(page: Page, frameTime: number): Promise<Buffer>;
  }

  // packages/renderer/src/index.ts
  import { RendererOptions } from './types';
  // ...
  const args = this.strategy.getFFmpegArgs(this.options, outputPath);
  ```
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  - Run `npm run render:canvas-example`.
- **Success Criteria**:
  - Build succeeds (resolving imports).
  - Render script completes.
  - `output/canvas-animation.mp4` is valid.
- **Edge Cases**: Ensure `Renderer` constructor still correctly instantiates strategies based on `options.mode`.
