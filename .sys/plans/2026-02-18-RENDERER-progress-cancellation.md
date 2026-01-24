#### 1. Context & Goal
- **Objective**: Implement progress reporting and cancellation support in the Node.js `Renderer`.
- **Trigger**: The Vision requires "Agent Experience First" and "Predictable APIs". Future "Helios Studio" needs job tracking and cancellation capabilities.
- **Impact**: Enables UIs (CLI, Studio) to show progress bars and cancel rendering jobs. Aligns the Node.js `Renderer` API with the browser-based `ClientSideExporter` in `packages/player`.

#### 2. File Inventory
- **Create**: `packages/renderer/scripts/verify-cancellation.ts` (Verification script to test progress and abort logic)
- **Modify**: `packages/renderer/src/types.ts` (Add `RenderJobOptions` interface)
- **Modify**: `packages/renderer/src/index.ts` (Update `render` signature and render loop logic)
- **Read-Only**: `packages/renderer/src/strategies/RenderStrategy.ts`

#### 3. Implementation Spec
- **Architecture**:
  - The `Renderer.render` method will be updated to accept an optional `RenderJobOptions` object containing `onProgress` and `signal`.
  - The render loop will explicitly check `signal.aborted` at each iteration and throw an `AbortError` if signaled.
  - A `try...finally` block will ensure `browser.close()` is called regardless of success or failure.
  - FFmpeg process will be killed immediately upon abortion to prevent zombie processes.
- **Pseudo-Code**:
  ```typescript
  // in types.ts
  export interface RenderJobOptions {
    onProgress?: (progress: number) => void; // 0.0 to 1.0
    signal?: AbortSignal;
  }

  // in index.ts
  public async render(url: string, output: string, options?: RenderJobOptions): Promise<void> {
    // ... setup browser ...
    try {
      // ... setup page ...
      // ... spawn ffmpeg ...

      // Handle AbortSignal
      if (options?.signal) {
        options.signal.addEventListener('abort', () => {
           // Kill FFmpeg
           // Browser close is handled in finally
        });
      }

      for (let i = 0; i < totalFrames; i++) {
        if (options?.signal?.aborted) throw new Error('Aborted');

        // ... capture ...

        if (options?.onProgress) {
          options.onProgress(i / totalFrames);
        }
      }
    } finally {
      await browser.close();
    }
  }
  ```
- **Public API Changes**:
  - Export `RenderJobOptions` from `packages/renderer/src/index.ts`.
  - `Renderer.render` signature change: `render(url: string, output: string, options?: RenderJobOptions): Promise<void>`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx ts-node packages/renderer/scripts/verify-cancellation.ts`
  - The script should start a 5-second render.
  - It should log "Progress: 0.1", "Progress: 0.2", etc.
  - It should abort the signal after 2 seconds.
  - The renderer should throw an error, which the script catches and verifies as an Abort error.
  - The script should verify that the output file is incomplete or deleted (optional).
- **Success Criteria**:
  - Progress logs appear in console.
  - Process exits gracefully on abort.
  - No orphaned FFmpeg or Chrome processes.
- **Edge Cases**:
  - Abort before start.
  - Abort during `prepare`.
  - Abort during `finish`.
