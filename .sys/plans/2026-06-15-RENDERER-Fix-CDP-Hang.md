# Context & Goal
- **Objective**: Prevent `CanvasStrategy` from hanging indefinitely during initialization when audio resources are present.
- **Trigger**: Architectural flaw identified where `CdpTimeDriver` pauses the virtual clock before `DomScanner` (in `CanvasStrategy`) can discover and load resources, causing `setTimeout` and media events to deadlock.
- **Impact**: Enables robust rendering of compositions with audio/video assets in "Canvas Mode" (Production), ensuring the "Production Rendering" vision (CDP-based) is viable.

# File Inventory
- **Create**: `packages/renderer/tests/verify-cdp-hang.ts` (Reproduction script)
- **Modify**: `packages/renderer/src/index.ts` (Reorder initialization)
- **Modify**: `packages/renderer/tests/verify-canvas-implicit-audio.ts` (Fix broken mock to support new Canvas existence check)
- **Read-Only**: `packages/renderer/src/strategies/CanvasStrategy.ts`, `packages/renderer/src/drivers/CdpTimeDriver.ts`

# Implementation Spec
- **Architecture**:
  - Change the `Renderer` initialization lifecycle to perform resource discovery (`strategy.prepare`) *before* seizing control of the browser clock (`timeDriver.prepare`).
  - This ensures that resource loading (which relies on the browser's event loop and wall-clock timers) completes using the standard environment before `CdpTimeDriver` applies the `pause` policy for deterministic frame rendering.
- **Pseudo-Code**:
  - In `packages/renderer/src/index.ts` -> `render()` method:
    - LOCATE `await this.timeDriver.prepare(page);`
    - LOCATE `await this.strategy.prepare(page);`
    - SWAP the order so `strategy.prepare` runs first.
  - In `packages/renderer/tests/verify-canvas-implicit-audio.ts`:
    - LOCATE `evaluate` mock function.
    - ADD check for `fnOrString.toString().includes('HTMLCanvasElement')` -> return `true`.
- **Public API Changes**: None.
- **Dependencies**: None.

# Test Plan
- **Verification**:
  1. Create reproduction script `packages/renderer/tests/verify-cdp-hang.ts` that serves HTML with `<audio preload="none">` and asserts successful render.
  2. Run `npx tsx packages/renderer/tests/verify-cdp-hang.ts`.
  3. Run `npx tsx packages/renderer/tests/verify-canvas-implicit-audio.ts` to ensure no regression in happy path.
- **Success Criteria**:
  - `verify-cdp-hang.ts` completes without timeout.
  - `verify-canvas-implicit-audio.ts` passes.
- **Edge Cases**:
  - Audio files that fail to load (handled by existing 10s timeout in `DomScanner` - now effective because clock is running).
