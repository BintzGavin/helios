# 2026-03-12-RENDERER-Refactor-Media-Discovery.md

#### 1. Context & Goal
- **Objective**: Consolidate duplicated media discovery logic (`findAllMedia`) from `CdpTimeDriver`, `SeekTimeDriver`, and `dom-scanner` into a single shared utility.
- **Trigger**: Identified code duplication where the same Shadow DOM traversal logic is copied in three places, violating DRY and risking inconsistent behavior.
- **Impact**: Improves maintainability and ensures that any future fixes to media discovery (e.g. for nested Shadow DOMs) are applied consistently across all rendering strategies.

#### 2. File Inventory
- **Create**: `packages/renderer/src/utils/dom-scripts.ts`
- **Modify**:
  - `packages/renderer/src/drivers/CdpTimeDriver.ts`
  - `packages/renderer/src/drivers/SeekTimeDriver.ts`
  - `packages/renderer/src/utils/dom-scanner.ts`
- **Read-Only**: `packages/renderer/src/utils/dom-finder.ts` (reference)

#### 3. Implementation Spec
- **Architecture**: Move the `findAllMedia` function definition into a shared string constant `FIND_ALL_MEDIA_FUNCTION` in `packages/renderer/src/utils/dom-scripts.ts`. This string will be interpolated into the `page.evaluate` scripts in the drivers and scanner.
- **Pseudo-Code**:
  ```typescript
  // packages/renderer/src/utils/dom-scripts.ts
  export const FIND_ALL_MEDIA_FUNCTION = `
    function findAllMedia(rootNode) {
      const media = [];
      if (rootNode.nodeType === Node.ELEMENT_NODE) {
        if (rootNode.tagName === 'AUDIO' || rootNode.tagName === 'VIDEO') media.push(rootNode);
      }
      const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') media.push(node);
        if (node.shadowRoot) media.push(...findAllMedia(node.shadowRoot));
      }
      return media;
    }
  `;
  ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run test` to execute the full suite, focusing on `verify-dom-media-preload.ts` and `verify-video-loop.ts` which rely on this logic.
- **Success Criteria**: All tests pass, confirming that media elements are still correctly discovered and synced.
- **Edge Cases**: Nested Shadow DOMs (already covered by the logic, but verifying existing behavior persists).
