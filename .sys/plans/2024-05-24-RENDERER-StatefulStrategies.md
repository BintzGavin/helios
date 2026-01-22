# Plan: Enable Stateful Render Strategies

#### 1. Context & Goal
- **Objective**: Introduce a `prepare(page: Page)` lifecycle method to the `RenderStrategy` interface to enable one-time setup logic before the rendering loop begins.
- **Trigger**: The current `CanvasStrategy` uses `toDataURL` (stateless), but the vision requires using WebCodecs `VideoEncoder` (stateful), which needs initialization within the browser context (creating the encoder, setting up event listeners) before frames are captured.
- **Impact**: Unlocks the implementation of the "High-Performance Canvas Path" (WebCodecs) and enables future optimizations for the DOM path (e.g., asset pre-loading).

#### 2. File Inventory
- **Modify**: `packages/renderer/src/strategies/RenderStrategy.ts` (Add `prepare` method to interface).
- **Modify**: `packages/renderer/src/index.ts` (Call `strategy.prepare(page)` after navigation).
- **Modify**: `packages/renderer/src/strategies/CanvasStrategy.ts` (Implement `prepare` as a no-op for now).
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts` (Implement `prepare` as a no-op for now).

#### 3. Implementation Spec
- **Architecture**:
  - Update the Strategy Pattern contract to include an initialization phase.
  - This moves the renderer from a "Stateless Execution" model to a "Stateful Lifecycle" model (Init -> Render -> Teardown implicit).
- **Public API Changes**:
  - `RenderStrategy` interface gains `prepare(page: Page): Promise<void>`.
- **Pseudo-Code**:
  ```typescript
  // packages/renderer/src/strategies/RenderStrategy.ts
  export interface RenderStrategy {
    prepare(page: Page): Promise<void>;
    // ... existing methods
  }

  // packages/renderer/src/index.ts
  // Inside render() method, after page.goto():
  console.log('Preparing render strategy...');
  await this.strategy.prepare(page);
  console.log('Strategy prepared.');
  // ... proceed to capture loop
  ```

#### 4. Test Plan
- **Verification**: Run the existing canvas render example to ensure no regressions.
  - Command: `npm run render:canvas-example`
- **Success Criteria**:
  - The render process completes without errors.
  - The output video file is generated (check `output/` directory or logs).
  - Logs show "Preparing render strategy..." and "Strategy prepared.".
- **Edge Cases**:
  - Ensure `prepare` is awaited properly.
  - Ensure `prepare` is called *after* the page is fully loaded (`networkidle`).
