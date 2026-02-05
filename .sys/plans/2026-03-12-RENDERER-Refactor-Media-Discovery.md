# 📋 RENDERER: Refactor Media Discovery Logic

## 1. Context & Goal
- **Objective**: Consolidate duplicated Shadow DOM media discovery logic from `DomScanner`, `CdpTimeDriver`, and `SeekTimeDriver` into a shared utility.
- **Trigger**: Identified in `2026-03-12` journal entry; code scans confirmed identical `findAllMedia` implementations triplicated across the codebase.
- **Impact**: Reduces maintenance risk, ensures consistent behavior between Canvas and DOM modes (and diagnostics), and simplifies future updates to Shadow DOM traversal logic.

## 2. File Inventory
- **Create**:
  - `packages/renderer/src/utils/dom-scripts.ts`: Will host the shared `FIND_ALL_MEDIA_FUNCTION` script string.
- **Modify**:
  - `packages/renderer/src/utils/dom-scanner.ts`: Import and use `FIND_ALL_MEDIA_FUNCTION`.
  - `packages/renderer/src/drivers/CdpTimeDriver.ts`: Import and use `FIND_ALL_MEDIA_FUNCTION`.
  - `packages/renderer/src/drivers/SeekTimeDriver.ts`: Import and use `FIND_ALL_MEDIA_FUNCTION`.
- **Read-Only**:
  - `packages/renderer/src/utils/dom-finder.ts`: Reference for script string pattern.

## 3. Implementation Spec
- **Architecture**:
  - Use the "Script String" pattern (as seen in `dom-finder.ts`) to export the function source code as a string constant (`FIND_ALL_MEDIA_FUNCTION`).
  - This is necessary because the code is executed via `page.evaluate()` in the browser context, not the Node.js context.
  - The shared function `findAllMedia(rootNode)` will recursively traverse Shadow DOMs using `TreeWalker` to find `<audio>` and `<video>` elements.

- **Pseudo-Code (dom-scripts.ts)**:
  ```typescript
  export const FIND_ALL_MEDIA_FUNCTION = `
  function findAllMedia(rootNode) {
    const media = [];
    // Check rootNode itself
    if (rootNode.nodeType === Node.ELEMENT_NODE && (rootNode.tagName === 'AUDIO' || rootNode.tagName === 'VIDEO')) {
      media.push(rootNode);
    }

    // Walk tree
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
  ```

- **Integration**:
  - In `dom-scanner.ts`: Inject `${FIND_ALL_MEDIA_FUNCTION}` into the evaluation string.
  - In `CdpTimeDriver.ts`: Inject `${FIND_ALL_MEDIA_FUNCTION}` into `mediaSyncScript`.
  - In `SeekTimeDriver.ts`: Inject `${FIND_ALL_MEDIA_FUNCTION}` into `script`.

- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run the full verification suite to ensure no regressions in media discovery or synchronization.
  - Command: `npx tsx tests/run-all.ts`
- **Specific Checks**:
  - `tests/verify-cdp-iframe-media-sync.ts`: Verifies `CdpTimeDriver` sync (Canvas mode).
  - `tests/verify-media-sync.ts`: Verifies `SeekTimeDriver` sync (DOM mode).
  - `tests/verify-canvas-implicit-audio.ts`: Verifies `DomScanner` discovery.
- **Success Criteria**: All tests pass.
