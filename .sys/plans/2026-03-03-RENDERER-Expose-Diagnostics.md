# Context & Goal
- **Objective**: Expose a programmatic `diagnose()` method on the `Renderer` class that returns environment capabilities (e.g., WebCodecs support, WAAPI) without performing a full render.
- **Trigger**: The Vision emphasizes "Agent Experience First" and "Diagnostics for AI Environments". Currently, diagnostics are only logged to the console during `render()`, making them inaccessible to higher-level tools or agents that need to verify the environment programmatically.
- **Impact**: Enables agents and tools to verify hardware acceleration and browser capabilities before starting expensive render jobs. Standardizes the diagnostic reporting pipeline.

# File Inventory
- **Modify**: `packages/renderer/src/strategies/RenderStrategy.ts` (Update interface return type)
- **Modify**: `packages/renderer/src/strategies/CanvasStrategy.ts` (Return report instead of logging)
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts` (Return report instead of logging)
- **Modify**: `packages/renderer/src/index.ts` (Add `diagnose` method, update `render` to log returned report)
- **Create**: `packages/renderer/tests/verify-diagnose.ts` (Verification script)

# Implementation Spec
- **Architecture**:
  - Update `RenderStrategy` interface to return `Promise<any>` instead of `void`.
  - Refactor strategies to return the diagnostic object from `page.evaluate`.
  - Add `diagnose()` to `Renderer` class which handles browser lifecycle (launch -> diagnose -> close) and returns the report.
  - Update `Renderer.render()` to explicitly log the returned diagnostic report (preserving existing CLI behavior).

- **Pseudo-Code**:
  ```typescript
  // RenderStrategy.ts
  interface RenderStrategy {
    // Change return type from Promise<void> to Promise<any>
    diagnose(page: Page): Promise<any>;
  }

  // CanvasStrategy.ts
  async diagnose(page: Page) {
    // Evaluate inside page
    // Gather capabilities (VideoEncoder, OffscreenCanvas, UserAgent)
    // Return the object directly (do not console.log inside page)
  }

  // DomStrategy.ts
  async diagnose(page: Page) {
    // Evaluate inside page
    // Gather capabilities (WAAPI, Animations API)
    // Return the object directly
  }

  // Renderer.ts
  class Renderer {
    async diagnose() {
      // 1. Launch browser (use same flags as render: --use-gl=egl, etc)
      // 2. Create context and page
      // 3. Call this.strategy.diagnose(page)
      // 4. Close browser
      // 5. Return report
    }

    async render(...) {
      // ... existing setup ...
      // Replace existing void call with:
      const report = await this.strategy.diagnose(page);
      // Log it manually to maintain CLI visibility
      console.log('[Helios Diagnostics]', JSON.stringify(report, null, 2));
      // ... continue render ...
    }
  }
  ```

- **Dependencies**: None.

# Test Plan
- **Verification**: Run `npx ts-node packages/renderer/tests/verify-diagnose.ts`
- **Success Criteria**:
  - Script instantiates `Renderer`.
  - Calls `renderer.diagnose()`.
  - Output contains a JSON object with `videoEncoder` (if canvas mode) or `waapi` (if dom mode).
  - `videoEncoder` should be boolean (likely true in this environment).
- **Edge Cases**:
  - Verify `mode: 'dom'` returns DOM-specific diagnostics.
  - Verify `mode: 'canvas'` returns Canvas-specific diagnostics.
