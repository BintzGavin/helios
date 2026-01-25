# 2025-02-18-RENDERER-diagnostics-integration.md

#### 1. Context & Goal
- **Objective**: Integrate environment diagnostics into the rendering pipeline to verify hardware acceleration and browser capabilities.
- **Trigger**: Vision Gap - The README states the library "includes `helios.diagnose()` to verify hardware acceleration", but the `Renderer` currently lacks a dedicated diagnostics step, relying on ad-hoc logging within `CanvasStrategy`.
- **Impact**: Improves debugging and observability for headless rendering environments, ensuring agents and users can verify GPU acceleration, WAAPI, and WebCodecs support.

#### 2. File Inventory
- **Create**: `packages/renderer/scripts/verify-diagnostics.ts` (Verification script to run diagnostics check)
- **Modify**: `packages/renderer/src/strategies/RenderStrategy.ts` (Add `diagnose` method to interface)
- **Modify**: `packages/renderer/src/strategies/CanvasStrategy.ts` (Implement `diagnose` to check VideoEncoder/OffscreenCanvas)
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts` (Implement `diagnose` to check WAAPI)
- **Modify**: `packages/renderer/src/index.ts` (Call `strategy.diagnose()` during initialization)
- **Read-Only**: `packages/core/src/index.ts` (Reference for diagnostic checks)

#### 3. Implementation Spec
- **Architecture**: Extend the Strategy Pattern. Each strategy knows what browser features it relies on, so it should be responsible for diagnosing its specific requirements.
- **Public API Changes**:
    - `RenderStrategy` interface gains `diagnose(page: Page): Promise<void>`.
    - No changes to `Renderer` public API (runs automatically or internally).
- **Pseudo-Code**:
  ```typescript
  // RenderStrategy.ts
  export interface RenderStrategy {
    // ... existing methods
    diagnose(page: Page): Promise<void>;
  }

  // CanvasStrategy.ts
  async diagnose(page: Page) {
    await page.evaluate(() => {
       console.log('[Helios Diagnostics] Checking Canvas environment...');
       const report = {
           videoEncoder: typeof VideoEncoder !== 'undefined',
           offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
           gpu: 'Check chrome://gpu'
       };
       console.log(JSON.stringify(report, null, 2));
    });
  }

  // DomStrategy.ts
  async diagnose(page: Page) {
      await page.evaluate(() => {
          console.log('[Helios Diagnostics] Checking DOM environment...');
          const report = {
              waapi: typeof document !== 'undefined' && 'timeline' in document,
              animations: document.getAnimations ? 'supported' : 'unsupported'
          };
          console.log(JSON.stringify(report, null, 2));
      });
  }

  // Renderer.ts
  // Inside render() method, after page load
  console.log('Running diagnostics...');
  await this.strategy.diagnose(page);
  // ... continue to prepare
  ```

#### 4. Test Plan
- **Verification**: Run `npx ts-node packages/renderer/scripts/verify-diagnostics.ts`
- **Success Criteria**:
    - The script successfully runs a render (even if short/dummy).
    - The output logs contain `[Helios Diagnostics]` and the JSON report.
    - Example: `videoEncoder: true`.
- **Edge Cases**:
    - Ensure it doesn't crash if `VideoEncoder` is missing (simulated if possible, otherwise rely on boolean check).
