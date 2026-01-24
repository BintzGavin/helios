# Context & Goal
- **Objective**: Implement asset preloading (fonts and images) in `DomStrategy` to ensure artifact-free rendering.
- **Trigger**: The `README.md` vision explicitly states that the DOM-to-Video path must "ensure all assets (images, fonts, etc.) are fully pre-loaded," but the current `DomStrategy.prepare()` method is a no-op.
- **Impact**: Eliminates visual artifacts (like FOUT or missing images) in the first few frames of DOM-based video exports.

# File Inventory
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts` (Implement `prepare` method)
- **Read-Only**: `packages/renderer/src/index.ts` (Reference for `prepare` call site)

# Implementation Spec
- **Architecture**: Use Playwright's `page.evaluate()` to execute client-side preloading logic within the browser context before the capture loop begins.
- **Pseudo-Code**:
  ```typescript
  async prepare(page: Page): Promise<void> {
    await page.evaluate(async () => {
      // 1. Wait for fonts
      await document.fonts.ready;

      // 2. Wait for images
      const images = Array.from(document.images);
      await Promise.all(images.map(img => {
        if (img.complete) return;
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve; // Don't block on broken images
        });
      }));
    });
  }
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

# Test Plan
- **Verification**:
  1. Create a temporary verification script `packages/renderer/scripts/verify-dom-preload.ts` that:
     - Instantiates `Renderer` with `{ mode: 'dom', ... }`.
     - Renders a dummy composition.
  2. Run: `npx ts-node packages/renderer/scripts/verify-dom-preload.ts`
  3. Run existing E2E tests: `npx ts-node tests/e2e/verify-render.ts` to ensure no regressions in the Canvas path.
- **Success Criteria**:
  - The DOM verification script executes successfully, logs "Strategy prepared", and produces a valid output file.
  - The Canvas regression test passes.
- **Edge Cases**:
  - Page has no images (Should return immediately).
  - Page has broken images (Should resolve `onerror` and not hang).
- **Pre-commit**:
  - Complete pre commit steps to ensure proper testing, verification, review, and reflection are done.
