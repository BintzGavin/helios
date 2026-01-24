# Context & Goal
- **Objective**: Implement asset preloading in `DomStrategy.prepare()` to ensure fonts and images are fully loaded before rendering begins.
- **Trigger**: The README explicitly requires preloading to prevent rendering artifacts (flashing content), but the current `DomStrategy.prepare()` is a no-op. Additionally, the DOM animation example is not currently verifiable.
- **Impact**: Ensures reliable DOM-to-Video rendering, matching the "Dual-Path Architecture" vision, and enables verification of DOM-based compositions.

# File Inventory
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts`
  - Implement `prepare(page)` logic.
- **Modify**: `vite.build-example.config.js`
  - Add `simple_dom` entry to `rollupOptions.input` to enable building the DOM example.
- **Create**: `packages/renderer/scripts/render-dom.ts`
  - A utility script to execute the renderer in DOM mode against the built example.

# Implementation Spec
- **Architecture**:
  - The `DomStrategy` will use `page.evaluate` during the `prepare` phase to inject a promise that resolves only when the document's fonts and images are ready.
  - The build configuration and verification script are necessary infrastructure updates to support and test this change.

- **Pseudo-Code**:
  1.  **In `DomStrategy.ts`**:
      ```typescript
      async prepare(page: Page): Promise<void> {
        console.log('DomStrategy: Preloading assets...');
        await page.evaluate(async () => {
          // 1. Wait for Fonts
          await document.fonts.ready;

          // 2. Wait for Images
          const images = Array.from(document.images);
          await Promise.all(images.map(img => {
             if (img.complete) return Promise.resolve();
             return new Promise((resolve) => {
               img.onload = resolve;
               img.onerror = resolve; // Don't block on error
             });
          }));
        });
        console.log('DomStrategy: Assets ready.');
      }
      ```

  2.  **In `vite.build-example.config.js`**:
      - Add `simple_dom: resolve(__dirname, "examples/simple-animation/composition.html")` to the `input` object.

  3.  **In `packages/renderer/scripts/render-dom.ts`**:
      - Import `Renderer` from `../src/index`.
      - Instantiate `Renderer` with `{ mode: 'dom', ... }`.
      - Set `compositionUrl` to resolve to `output/example-build/examples/simple-animation/composition.html`.
      - Set `outputPath` to `output/dom-animation.mp4`.
      - Execute `renderer.render`.

- **Public API Changes**: None.
- **Dependencies**:
  - `packages/core` must be built before building examples (`npm run build -w packages/core`).

# Test Plan
- **Verification**:
  - Run the following command chain:
    ```bash
    npm run build -w packages/core && npm run build:examples && npx ts-node packages/renderer/scripts/render-dom.ts
    ```
- **Success Criteria**:
  - `output/dom-animation.mp4` is created and has a file size > 0.
  - Console logs indicate "DomStrategy: Preloading assets..." followed by "DomStrategy: Assets ready."
- **Edge Cases**:
  - Pages with no images/fonts should resolve immediately.
  - Broken image links should not hang the renderer (handled by `onerror`).
