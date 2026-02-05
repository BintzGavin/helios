# Plan: Implement DOM Selector Support

## 1. Context & Goal
- **Objective**: Add `domSelector` support to `DomStrategy` to allow capturing specific DOM elements instead of the full viewport.
- **Trigger**: Vision gap identified (parity with `CanvasStrategy` which has `canvasSelector`).
- **Impact**: Enables rendering individual components or sub-sections of a page without capturing unwanted UI elements or empty space.

## 2. File Inventory
- **Modify**: `packages/renderer/src/types.ts` (Add `domSelector` to `RendererOptions`)
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts` (Update `capture` to use selector)
- **Create**: `packages/renderer/tests/verify-dom-selector.ts` (Verification script)
- **Read-Only**: `packages/renderer/src/Renderer.ts`

## 3. Implementation Spec
- **Architecture**:
  - Extend `RendererOptions` interface.
  - In `DomStrategy.capture()`, check if `domSelector` is provided.
  - If yes, use `page.locator(selector).first().screenshot()`.
  - If no, keep using `page.screenshot()`.
- **Public API Changes**:
  - `RendererOptions.domSelector` (optional string).
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm run build -w packages/renderer && npx tsx packages/renderer/tests/verify-dom-selector.ts`
- **Success Criteria**:
  - Render a video of a specific `<div>` (e.g., 200x200 red box) from a page with a larger viewport (1920x1080).
  - Verify that the output video file exists at the specified path.
- **Edge Cases**:
  - Selector not found (should throw/timeout).
  - Selector matches multiple elements (should use `.first()`).
