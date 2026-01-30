# Plan: CORE - Implement Recursive Shadow DOM Media Discovery

## 1. Context & Goal
- **Objective**: Enable `DomDriver` to discover and synchronize media elements (`<audio>`, `<video>`) located within Shadow DOM boundaries.
- **Trigger**: Vision gap identified - `DomDriver` relies on `querySelectorAll` which is shallow and fails to find media inside Web Components, creating a disparity between preview (incorrect) and render (correct, via `SeekTimeDriver`).
- **Impact**: Ensures correct preview behavior for compositions utilizing Web Components or other Shadow DOM-based structures, aligning `packages/core` with the "Headless Logic Engine" vision of being framework-agnostic.

## 2. File Inventory
- **Modify**: `packages/core/src/drivers/DomDriver.ts` - Implement recursive traversal logic.
- **Modify**: `packages/core/src/drivers/DomDriver.test.ts` - Add test cases for Shadow DOM discovery.

## 3. Implementation Spec
- **Architecture**:
  - Replace `querySelectorAll` and shallow checks with a recursive tree traversal strategy.
  - Implement `findAllMedia(root: Node): HTMLMediaElement[]` helper method.
  - Traverse `childNodes` and recursively descend into `shadowRoot` (if `mode: 'open'`).
- **Pseudo-Code**:
  ```typescript
  private findAllMedia(root: Node): HTMLMediaElement[] {
    const media: HTMLMediaElement[] = [];
    const walker = (node: Node) => {
      // Check if node is media (using nodeName for safety)
      if (node.nodeName === 'AUDIO' || node.nodeName === 'VIDEO') {
        media.push(node as HTMLMediaElement);
      }

      // Check shadow root (must be Element to have shadowRoot)
      if (node instanceof Element && node.shadowRoot) {
        walker(node.shadowRoot);
      }

      // Check children
      // We iterate childNodes to support both Elements and other node types if needed,
      // but primarily to descend into nested structures.
      const children = node.childNodes;
      for (let i = 0; i < children.length; i++) {
        walker(children[i]);
      }
    };

    walker(root);
    return media;
  }
  ```
- **Integration**:
  - In `init(scope)`: `this.mediaElements = new Set(this.findAllMedia(scope));`
  - In `scanAndAdd(node)`: `this.findAllMedia(node).forEach(el => this.mediaElements.add(el));`
  - In `scanAndRemove(node)`: `this.findAllMedia(node).forEach(el => this.mediaElements.delete(el));`

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - Existing tests pass.
  - New test case: Create a custom element (or simple div) with `attachShadow({ mode: 'open' })`, append a `<video>` to the shadow root, and verify `DomDriver` controls it (e.g., updates `currentTime` and play state).
- **Edge Cases**:
  - `shadowRoot` is closed (cannot be traversed, should gracefully fail to find media).
  - Nested Shadow DOMs.
  - Dynamic addition of Shadow DOM hosts.
