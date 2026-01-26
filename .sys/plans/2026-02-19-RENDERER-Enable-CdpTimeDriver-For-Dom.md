# Plan: Enable CdpTimeDriver for DOM Strategy

## 1. Context & Goal
- **Objective**: Standardize `DomStrategy` to use `CdpTimeDriver` (Chrome DevTools Protocol) instead of `SeekTimeDriver` (WAAPI seeking).
- **Trigger**: Journal entry noting technical debt and deviation from the Vision ("Production Rendering uses CDP").
- **Impact**: Ensures frame-exact determinism for DOM animations, aligns with the documented architecture, and removes reliance on writing to read-only `document.timeline`.

## 2. File Inventory
- **Modify**:
  - `packages/renderer/src/index.ts`: Update `Renderer` constructor to use `CdpTimeDriver` for `dom` mode.
- **Read-Only**:
  - `packages/renderer/src/drivers/CdpTimeDriver.ts`
  - `packages/renderer/src/strategies/DomStrategy.ts`

## 3. Implementation Spec
- **Architecture**:
  - Eliminate the conditional logic in the `Renderer` class (in `packages/renderer/src/index.ts`) that selects `SeekTimeDriver` for `dom` mode.
  - Make `CdpTimeDriver` the universal time source for all production rendering strategies.

- **Pseudo-Code**:
  ```typescript
  // packages/renderer/src/index.ts

  constructor(options: RendererOptions) {
    this.options = options;

    // Select Strategy
    if (this.options.mode === 'dom') {
      this.strategy = new DomStrategy();
    } else {
      this.strategy = new CanvasStrategy(this.options);
    }

    // UNIFIED: Use CdpTimeDriver for ALL modes
    // Previous logic forced SeekTimeDriver for 'dom' due to historical compatibility issues.
    // We are now switching to CDP to fulfill the Vision.
    this.timeDriver = new CdpTimeDriver();
  }
  ```

## 4. Test Plan
- **Verification**:
  1. **Build Examples**: Run `npm run build:examples` to generate artifacts.
  2. **Verify Canvas (Regression Test)**:
     - Run `npm run render:canvas-example`.
     - Confirm `output/canvas-animation.mp4` is created and plays correctly (no hangs).
  3. **Verify DOM (New Feature Test)**:
     - Create a temporary script `packages/renderer/scripts/render-dom.ts` (copy of `packages/renderer/scripts/render.ts`).
     - Modify it to point to `output/example-build/examples/simple-animation/composition.html` and set `mode: 'dom'` in `RendererOptions`.
     - Run: `npx ts-node packages/renderer/scripts/render-dom.ts`.
     - Confirm `output/canvas-animation.mp4` (or whatever output path is used) is created and plays correctly.
- **Success Criteria**:
  - Both DOM and Canvas renders complete without hanging.
  - `page.screenshot` (used in DomStrategy) functions correctly under virtual time.
- **Edge Cases**:
  - If `page.screenshot` hangs, the `CdpTimeDriver` might need to be debugged to ensure the virtual time budget is sufficient for the screenshot capture or that Playwright's screenshot method is compatible with paused virtual time.
