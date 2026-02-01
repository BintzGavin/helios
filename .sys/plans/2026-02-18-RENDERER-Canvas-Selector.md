# Context & Goal
- **Objective**: Implement `canvasSelector` option in `Renderer` to allow targeting a specific `<canvas>` element during rendering.
- **Trigger**: Vision Gap - The README implies robust Canvas support, but `CanvasStrategy` currently naively selects the first `<canvas>` element, causing failure in multi-canvas environments (e.g., stacked layers).
- **Impact**: Enables rendering of complex multi-canvas compositions (e.g., separate background/foreground layers) by allowing the user to specify the target canvas.

# File Inventory
- **Create**:
  - `tests/e2e/verify-multi-canvas.ts`: Verification script using a multi-canvas Data URL composition.
- **Modify**:
  - `packages/renderer/src/types.ts`: Add `canvasSelector` to `RendererOptions`.
  - `packages/renderer/src/strategies/CanvasStrategy.ts`: Update capture methods to use the selector.
- **Read-Only**:
  - `packages/renderer/src/Renderer.ts`: To verify option passing.

# Implementation Spec
- **Architecture**:
  - Update `CanvasStrategy` to accept `canvasSelector` (defaulting to `'canvas'`).
  - Pass this selector into `page.evaluate` contexts during `captureWebCodecs` and `captureCanvas`.
  - Use `document.querySelector(selector)` instead of hardcoded `document.querySelector('canvas')`.
  - Ensure clear error messaging if the selected canvas is not found.
- **Pseudo-Code**:
  - IN `CanvasStrategy.prepare`:
    - GET selector from `options.canvasSelector` OR default to `'canvas'`.
    - IN `page.evaluate`:
      - FIND element using selector.
      - IF not found OR not canvas: THROW error "Canvas not found matching selector: [selector]".
  - IN `CanvasStrategy.captureWebCodecs`:
    - PASS selector to evaluate.
    - FIND canvas using selector.
    - CAPTURE frame.
  - IN `CanvasStrategy.captureCanvas`:
    - PASS selector to evaluate.
    - FIND canvas using selector.
    - CALL `toDataURL`.
- **Public API Changes**:
  - `RendererOptions` interface gains `canvasSelector?: string`.
- **Dependencies**: None.

# Test Plan
- **Verification**: `npx tsx tests/e2e/verify-multi-canvas.ts`
- **Success Criteria**:
  - Render 1: Target `#canvas-a` (Red) -> Output file created, size > 0.
  - Render 2: Target `#canvas-b` (Blue) -> Output file created, size > 0.
  - Render 3: Target `#canvas-z` (Missing) -> Fails with specific "Canvas not found" error.
- **Edge Cases**:
  - Selector matches multiple elements -> `querySelector` picks first (standard DOM behavior).
  - Selector matches non-canvas element -> `CanvasStrategy` should check `instanceof HTMLCanvasElement` or throw.
