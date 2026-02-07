# 1. Context & Goal
- **Objective**: Enable `canvas-selector` (and `export-mode="canvas"`) to locate and export `HTMLCanvasElement` nodes nested inside open Shadow DOM trees.
- **Trigger**: Currently, `bridge.ts` and `controllers.ts` use `document.querySelector()` which cannot pierce Shadow DOM boundaries, causing `export-mode="canvas"` to fail for Web Component-based compositions.
- **Impact**: Unblocks high-performance video export for modern, encapsulated compositions (e.g., using Lit, Stencil, or raw Web Components) without falling back to slower DOM serialization.

# 2. File Inventory
- **Create**: `packages/player/src/utils/dom.ts` (New shared utility for DOM traversal)
- **Modify**: `packages/player/src/bridge.ts` (Update `handleCaptureFrame` to use new utility)
- **Modify**: `packages/player/src/controllers.ts` (Update `DirectController.captureFrame` to use new utility)
- **Read-Only**: `packages/player/src/features/dom-capture.ts`

# 3. Implementation Spec
- **Architecture**:
  - Extract a robust `findCanvas` utility function.
  - The function attempts a direct query first (fast path).
  - If not found, it recursively traverses open `shadowRoot`s of all descendant elements.
- **Pseudo-Code**:
  ```typescript
  export function findCanvas(root: Node, selector: string): HTMLCanvasElement | null {
    // 1. Try direct query on current root (Document or ShadowRoot)
    // Note: root might not have querySelector if it's a generic Node, so cast/check.
    if ('querySelector' in root) {
      const direct = (root as ParentNode).querySelector(selector);
      if (direct instanceof HTMLCanvasElement) return direct;
    }

    // 2. Recursive search in open Shadow Roots
    // We need to iterate all elements in the current root to find shadow roots.
    // querySelectorAll('*') is generally safe and fast enough for most compositions.
    if ('querySelectorAll' in root) {
        const elements = (root as ParentNode).querySelectorAll('*');
        for (const el of elements) {
          if (el.shadowRoot && el.shadowRoot.mode === 'open') {
            const found = findCanvas(el.shadowRoot, selector);
            if (found) return found;
          }
        }
    }
    return null;
  }
  ```
- **Public API Changes**: None. Internal logic update.
- **Dependencies**: None.

# 4. Test Plan
- **Verification**:
  - Run `npm test` in `packages/player`.
  - Add a unit test in `packages/player/src/utils/dom.test.ts` (create this) that constructs a DOM with nested Shadow Roots and verifies `findCanvas` locates the target.
- **Success Criteria**:
  - `findCanvas` returns the correct `<canvas>` element from within a Shadow Root.
  - `findCanvas` returns `null` if not found.
  - Existing functionality (light DOM canvas) remains unaffected (regression test).
- **Edge Cases**:
  - Canvas inside nested Shadow Roots (depth > 1).
  - Closed Shadow Roots (should be gracefully skipped).
  - Multiple canvases matching selector (should return first found).
