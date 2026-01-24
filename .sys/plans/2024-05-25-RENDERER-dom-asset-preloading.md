#### 1. Context & Goal
- **Objective**: Implement robust asset preloading (fonts, images) in the DOM rendering strategy to prevent visual artifacts.
- **Trigger**: The README states that for the DOM-to-Video path, "A critical optimization is ensuring all assets (images, fonts, etc.) are fully pre-loaded before the render loop begins". Currently, `DomStrategy.prepare` is a no-op.
- **Impact**: Ensures high-quality renders for DOM-based compositions by preventing "pop-in" of fonts or images during the first few frames.

#### 2. File Inventory
- **Create**:
  - `tests/e2e/verify-dom-render.ts`: A new verification script to confirm the DOM strategy works end-to-end.
- **Modify**:
  - `packages/renderer/src/strategies/DomStrategy.ts`: Implement `prepare` method.
  - `vite.build-example.config.js`: Add `simple_dom` to build inputs to enable testing.
- **Read-Only**:
  - `packages/renderer/src/index.ts` (To understand invocation context)

#### 3. Implementation Spec
- **Architecture**: Update `DomStrategy` to use `page.evaluate` during the `prepare` phase to query the DOM state.
- **Pseudo-Code**:
  ```typescript
  // packages/renderer/src/strategies/DomStrategy.ts

  async prepare(page: Page): Promise<void> {
    await page.evaluate(async () => {
      // 1. Wait for Fonts
      await document.fonts.ready;

      // 2. Wait for Images
      const images = Array.from(document.images);
      await Promise.all(images.map(img => {
        if (img.complete) return;
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve; // Continue even if one image fails
        });
      }));
    });
  }
  ```
- **Public API Changes**: None. Internal strategy update.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  1. Build the examples: `npm run build:examples`
  2. Run the verification script: `npx ts-node tests/e2e/verify-dom-render.ts`
- **Success Criteria**:
  - The script completes successfully.
  - A video file `output/dom-render-verified.mp4` is created.
- **Edge Cases**:
  - Broken images (should not hang the renderer).
  - No images or fonts (should pass immediately).
