# Spec: Verify DOM Rendering in E2E Tests

## 1. Context & Goal
- **Objective**: Update the E2E verification script to verify the DOM-based rendering path using the existing `examples/simple-animation` composition.
- **Trigger**: The README promises "Path 1: DOM-to-Video" and "Use Standard CSS Animations", but the current `tests/e2e/verify-render.ts` only verifies Canvas-based examples.
- **Impact**: Ensures the versatile DOM rendering strategy works as expected and prevents regressions for users relying on standard CSS/HTML animations.

## 2. File Inventory
- **Create**: (None)
- **Modify**: `tests/e2e/verify-render.ts` (Update cases to include DOM example and support `mode`)
- **Read-Only**: `examples/simple-animation/composition.html`, `packages/renderer/src/index.ts`

## 3. Implementation Spec
- **Architecture**: The script manually iterates through test cases. We will extend the test case structure to include a `mode` property (`'canvas' | 'dom'`) and pass it to the `Renderer` constructor.
- **Pseudo-Code**:
  ```typescript
  // tests/e2e/verify-render.ts

  const CASES = [
    // ... existing cases ...
    { name: 'Canvas', relativePath: 'examples/simple-canvas-animation/composition.html', mode: 'canvas' },
    { name: 'DOM', relativePath: 'examples/simple-animation/composition.html', mode: 'dom' }, // NEW
    // ...
  ];

  // Inside main loop:
  const renderer = new Renderer({
    // ...
    mode: testCase.mode || 'canvas', // Default to canvas if undefined
  });
  ```
- **Public API Changes**: None (Internal test script change).
- **Dependencies**: Requires `npm run build:examples` to generate the DOM composition artifact (already part of workflow).

## 4. Test Plan
- **Verification**: `npm run build -w packages/core && npm run build:examples && npx tsx tests/e2e/verify-render.ts`
- **Success Criteria**:
    - Console output shows: `✅ DOM Passed! Video saved to: .../output/dom-render-verified.mp4`
    - `output/dom-render-verified.mp4` file exists and is a valid video.
    - All existing tests (Canvas, React, Vue, Svelte) continue to pass.
- **Edge Cases**:
    - Ensure `mode` defaults to 'canvas' correctly for existing cases if not strictly typed in the array.
