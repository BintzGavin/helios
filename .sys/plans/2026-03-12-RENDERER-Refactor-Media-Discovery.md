# Refactor Media Discovery Logic

#### 1. Context & Goal
- **Objective**: Deduplicate the Shadow DOM media discovery logic (`findAllMedia`) which is currently copy-pasted across `DomScanner`, `CdpTimeDriver`, and `SeekTimeDriver`.
- **Trigger**: Codebase exploration revealed identical complex tree-walking logic in three separate files, violating DRY and increasing maintenance risk.
- **Impact**: Improves code maintainability and ensures consistent media synchronization behavior (including Shadow DOM support) across both Canvas and DOM rendering strategies.

#### 2. File Inventory
- **Create**: `packages/renderer/src/utils/dom-scripts.ts` (To house shared DOM script snippets)
- **Modify**:
  - `packages/renderer/src/utils/dom-scanner.ts`
  - `packages/renderer/src/drivers/CdpTimeDriver.ts`
  - `packages/renderer/src/drivers/SeekTimeDriver.ts`
- **Read-Only**: `packages/renderer/src/utils/dom-finder.ts` (Reference for script pattern)

#### 3. Implementation Spec
- **Architecture**: Extract the `findAllMedia` function source code into a constant `FIND_ALL_MEDIA_SCRIPT` in the new utils file. Import and inject this string into the `page.evaluate` scripts in the consumers.
- **Pseudo-Code**:
  ```typescript
  // packages/renderer/src/utils/dom-scripts.ts
  export const FIND_ALL_MEDIA_SCRIPT = `
    function findAllMedia(rootNode) {
      const media = [];
      // Check rootNode (if it is an Element)
      if (rootNode.nodeType === Node.ELEMENT_NODE) {
        const tagName = rootNode.tagName;
        if (tagName === 'AUDIO' || tagName === 'VIDEO') {
          media.push(rootNode);
        }
      }

      const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
          media.push(node);
        }
        if (node.shadowRoot) {
          media.push(...findAllMedia(node.shadowRoot));
        }
      }
      return media;
    }
  `;

  // packages/renderer/src/utils/dom-scanner.ts
  import { FIND_ALL_MEDIA_SCRIPT } from './dom-scripts.js';
  // ...
  const script = `
    (async () => {
      ${FIND_ALL_MEDIA_SCRIPT}
      const mediaElements = findAllMedia(document);
      // ... rest of logic
    })()
  `;
  ```
- **Public API Changes**: None. Internal refactor.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run the renderer test suite, specifically focusing on Shadow DOM and Media Sync tests.
  - `npm run test -- packages/renderer/tests/verify-shadow-dom-audio.ts`
  - `npm run test -- packages/renderer/tests/verify-cdp-shadow-dom-sync.ts`
  - `npm run test -- packages/renderer/tests/verify-media-sync.ts`
- **Success Criteria**: All tests pass, confirming that media elements are still correctly discovered and synchronized in both DOM and Canvas modes.
- **Edge Cases**: Nested Shadow DOMs (covered by existing tests).
