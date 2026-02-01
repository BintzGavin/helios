# Context & Goal
- **Objective**: Implement `canvasSelector` option in `Renderer` to allow targeting a specific `<canvas>` element during rendering.
- **Trigger**: Vision Gap - `CanvasStrategy` currently naively selects the first `<canvas>` element, causing failure in multi-canvas environments (e.g., stacked layers, off-screen buffers).
- **Impact**: Enables rendering of complex multi-canvas compositions by allowing the user to specify the target canvas ID or class.

# File Inventory
- **Create**:
  - `packages/renderer/tests/verify-canvas-selector.ts`: Verification script using a multi-canvas HTML setup.
- **Modify**:
  - `packages/renderer/src/types.ts`: Add `canvasSelector` to `RendererOptions`.
  - `packages/renderer/src/strategies/CanvasStrategy.ts`: Update capture logic to use the selector.
  - `packages/renderer/tests/run-all.ts`: Add `tests/verify-canvas-selector.ts` to the test suite.
- **Read-Only**:
  - `packages/renderer/src/Renderer.ts`: To verify option passing.

# Implementation Spec
- **Architecture**:
  - Update `CanvasStrategy` to accept `canvasSelector` (defaulting to `'canvas'`).
  - Pass this selector into `page.evaluate` contexts during `captureWebCodecs`, `captureCanvas`, and `prepare`.
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
- **Verification**: `npx tsx packages/renderer/tests/verify-canvas-selector.ts`
- **Success Criteria**:
  - Render 1: `canvasSelector: '#canvas-a'` -> Output file created (proves it found the specific canvas).
  - Render 2: `canvasSelector: '#canvas-b'` -> Output file created (proves it found the other specific canvas).
  - Render 3: `canvasSelector: '#missing'` -> Fails with specific "Canvas not found" error (proves it didn't default to the existing canvas).
- **Edge Cases**:
  - Selector matches multiple elements -> `querySelector` picks first (standard DOM behavior).
  - Selector matches non-canvas element -> `CanvasStrategy` should check `instanceof HTMLCanvasElement` or throw.
