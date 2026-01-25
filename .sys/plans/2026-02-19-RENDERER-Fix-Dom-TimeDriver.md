# Context & Goal
- **Objective**: Use `SeekTimeDriver` for DOM-based rendering to resolve `CdpTimeDriver` incompatibility.
- **Trigger**: `DomStrategy` (Playwright screenshot) hangs when used with `CdpTimeDriver` (Virtual Time), rendering the DOM path unusable.
- **Impact**: Restores functionality to the "DOM-to-Video" rendering path, enabling HTML/CSS animations to be rendered.

# File Inventory
- **Modify**: `packages/renderer/src/index.ts` (Implement conditional driver selection in `Renderer` constructor)
- **Read-Only**: `packages/renderer/src/drivers/SeekTimeDriver.ts`, `packages/renderer/src/drivers/CdpTimeDriver.ts`

# Implementation Spec
- **Architecture**: In the `Renderer` constructor, check `this.options.mode`. If `mode === 'dom'`, instantiate `SeekTimeDriver`. Otherwise, default to `CdpTimeDriver`.
- **Pseudo-Code**:
  ```typescript
  constructor(options: RendererOptions) {
    // ...
    if (this.options.mode === 'dom') {
      this.strategy = new DomStrategy();
      this.timeDriver = new SeekTimeDriver(); // Use Seek for DOM
    } else {
      this.strategy = new CanvasStrategy();
      this.timeDriver = new CdpTimeDriver(); // Use CDP for Canvas (default)
    }
  }
  ```

# Test Plan
- **Verification**:
  1. Create a temporary test script `packages/renderer/scripts/verify-dom-render.ts` that initializes `Renderer` with `{ mode: 'dom' }`.
  2. Run the DOM verification script using `ts-node`.
  3. Run the existing canvas verification script `packages/renderer/scripts/render.ts` using `ts-node` to ensure no regressions.
- **Success Criteria**:
  - DOM render completes without hanging and produces a valid video.
  - Canvas render completes successfully as before.
- **Edge Cases**: Ensure `mode` defaults to 'canvas' if undefined (implicitly handled by else block).
