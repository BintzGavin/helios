# 2026-03-11-RENDERER-Dom-Selector.md

#### 1. Context & Goal
- **Objective**: Implement `targetSelector` support in `DomStrategy` to enable partial page rendering (e.g., specific components) and unify selector logic with `CanvasStrategy`.
- **Trigger**: Vision Gap - `DomStrategy` currently only supports full viewport capture, limiting use cases like component previews or overlays. `CanvasStrategy` has `canvasSelector`, but `DomStrategy` has no equivalent.
- **Impact**: Enables granular DOM rendering and provides a unified `targetSelector` API for both strategies.

#### 2. File Inventory
- **Create**:
  - `packages/renderer/src/utils/dom-finder.ts` (Shared deep element finder script)
  - `packages/renderer/tests/verify-dom-selector.ts`
- **Modify**:
  - `packages/renderer/src/types.ts` (Add `targetSelector`, deprecate `canvasSelector`)
  - `packages/renderer/src/strategies/DomStrategy.ts` (Implement selector-based capture)
  - `packages/renderer/src/strategies/CanvasStrategy.ts` (Adopt `targetSelector` and shared finder)
- **Read-Only**: `README.md`

#### 3. Implementation Spec
- **Architecture**:
  - Introduce `targetSelector` in `RendererOptions` as the primary selector config.
  - Extract the "Deep Finder" logic (recursive Shadow DOM traversal) from `CanvasStrategy` into a shared utility string in `dom-finder.ts`.
  - Update `DomStrategy` to:
    - In `prepare`, if `targetSelector` is provided, use `page.evaluateHandle` with the deep finder to locate the target element.
    - Store the `ElementHandle` in the class instance.
    - In `capture`, if a handle exists, call `elementHandle.screenshot()`; otherwise, fallback to `page.screenshot()`.
  - Update `CanvasStrategy` to:
    - Use `targetSelector` (falling back to `canvasSelector` or 'canvas').
    - Use the shared deep finder script.

- **Pseudo-Code**:
  - **utils/dom-finder.ts**:
    ```typescript
    export const FIND_ELEMENT_SCRIPT = `
      ((selector) => {
        function find(root, selector) {
          // Fast path for Light DOM (if querySelector is available)
          if (root.querySelector) {
            try {
              const light = root.querySelector(selector);
              if (light) return light;
            } catch (e) {
              // Ignore invalid selector errors during search
            }
          }

          // Recursive traversal for Shadow DOM
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
          while (walker.nextNode()) {
            const node = walker.currentNode;
            if (node.shadowRoot) {
              const found = find(node.shadowRoot, selector);
              if (found) return found;
            }
          }
          return null;
        }
        return find(document, selector);
      })
    `;
    ```
  - **DomStrategy.ts**:
    - `prepare(page)`:
      - `const selector = this.options.targetSelector;`
      - `if (selector)`:
        - `const handle = await page.evaluateHandle(FIND_ELEMENT_SCRIPT, selector)`
        - `if (!handle.asElement()) throw Error(\`Element not found matching selector: \${selector}\`)`
        - `this.targetHandle = handle.asElement()`
    - `capture(page)`:
      - `if (this.targetHandle) return this.targetHandle.screenshot({ type: 'png', omitBackground: hasAlpha })`
      - `else return page.screenshot(...)`
  - **CanvasStrategy.ts**:
    - Update `prepare` to use `FIND_ELEMENT_SCRIPT` and set `window.__HELIOS_TARGET_CANVAS__`.
    - Check `options.targetSelector || options.canvasSelector || 'canvas'`.

- **Public API Changes**:
  - `RendererOptions`:
    - `targetSelector?: string`
    - `canvasSelector?: string` (Comment: Deprecated, use targetSelector)

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-dom-selector.ts`
- **Success Criteria**:
  - Render a DOM composition with `targetSelector` pointing to a specific `<div>` (e.g. `200x200`).
  - Output image/frame dimensions match the `<div>` dimensions, ignoring the rest of the 1920x1080 viewport.
- **Edge Cases**:
  - Selector not found (Strategy should throw).
  - Selector in Shadow DOM (Verified by deep finder).
