# 2026-09-07-RENDERER-Dom-Target-Selector.md

#### 1. Context & Goal
- **Objective**: Implement `targetSelector` support in `DomStrategy` to enable partial page rendering and unify deep element finding logic.
- **Trigger**: Vision Gap - `DomStrategy` lacks the ability to render specific elements (unlike `CanvasStrategy`), forcing full-viewport capture. A previous plan (`2026-03-11`) addressed this but was not implemented.
- **Impact**: Enables users to render specific components (e.g. charts, widgets) in DOM mode, improving flexibility and parity with Canvas mode.

#### 2. File Inventory
- **Create**:
  - `packages/renderer/src/utils/dom-finder.ts` (Shared deep element finder script)
  - `packages/renderer/tests/verify-dom-selector.ts` (Verification script)
  - `packages/renderer/tests/fixtures/dom-selector.html` (Test fixture)
- **Modify**:
  - `packages/renderer/src/types.ts` (Add `targetSelector`)
  - `packages/renderer/src/strategies/DomStrategy.ts` (Implement selector logic)
  - `packages/renderer/src/strategies/CanvasStrategy.ts` (Refactor to use shared finder)
- **Read-Only**: `README.md`, `packages/renderer/src/Renderer.ts`

#### 3. Implementation Spec
- **Architecture**:
  - **Shared Logic**: Extract the "Deep Tree Walker" logic (which supports Shadow DOM recursion) into a reusable string constant `FIND_DEEP_ELEMENT_SCRIPT` in `dom-finder.ts`.
  - **Types**: Add `targetSelector` to `RendererOptions` (cleaner name than `canvasSelector` for generic use).
  - **DomStrategy**: In `capture()`, if `targetSelector` is present, use the shared script via `page.evaluateHandle` to locate the element and call `elementHandle.screenshot()`.
  - **CanvasStrategy**: Replace the hardcoded walker string with the shared `FIND_DEEP_ELEMENT_SCRIPT`.

- **Pseudo-Code**:
  - **dom-finder.ts**:
    ```typescript
    export const FIND_DEEP_ELEMENT_SCRIPT = `
      (root, selector, type) => {
        function findRecursive(node) {
          // TreeWalker to find selector matches
          // ...
          // Recurse into Shadow Roots
          // ...
        }
        return findRecursive(root);
      }
    `;
    ```
  - **DomStrategy.ts**:
    ```typescript
    async capture(page, frameTime) {
      if (this.options.targetSelector) {
        const handle = await page.evaluateHandle((args) => {
           const finder = eval(args.script);
           return finder(document, args.selector);
        }, { script: FIND_DEEP_ELEMENT_SCRIPT, selector: ... });
        return handle.asElement().screenshot(options);
      } else {
        return page.screenshot(options);
      }
    }
    ```

- **Public API Changes**:
  - `RendererOptions` interface gains `targetSelector?: string`.

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-dom-selector.ts`
- **Success Criteria**:
  - Test case 1: `#target` (500x500 div) -> Output video is 500x500.
  - Test case 2: `#shadow-target` (inside shadow DOM) -> Output video is correct dimension.
  - Test case 3: Missing selector -> Throws informative error.
- **Edge Cases**:
  - `targetSelector` exists but element is missing (should fail fast or fail at capture).
  - `targetSelector` inside deep Shadow DOM.
