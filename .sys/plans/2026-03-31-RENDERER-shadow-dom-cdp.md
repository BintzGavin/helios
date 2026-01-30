# Plan: Enable Shadow DOM Media Sync in CdpTimeDriver

#### 1. Context & Goal
- **Objective**: Enable synchronization of media elements (`<video>`, `<audio>`) located inside Shadow DOMs when using `CdpTimeDriver` (Canvas Mode).
- **Trigger**: `CdpTimeDriver` currently uses `document.querySelectorAll`, which cannot see inside Shadow DOMs, causing synchronization failures for Web Components in Canvas mode.
- **Impact**: Ensures correct rendering of Web Components with internal video/audio in Canvas mode, matching the capabilities of DOM mode.

#### 2. File Inventory
- **Create**:
  - `packages/renderer/tests/verify-cdp-shadow-dom.ts`: A new verification script that sets up a Shadow DOM with a video and asserts that `CdpTimeDriver` correctly sets its `currentTime`.
- **Modify**:
  - `packages/renderer/src/drivers/CdpTimeDriver.ts`: Replace flat `querySelectorAll` with recursive `TreeWalker` discovery.
- **Read-Only**:
  - `packages/renderer/src/drivers/SeekTimeDriver.ts`: Source of the `findAllMedia` utility function.

#### 3. Implementation Spec
- **Architecture**: In-line the recursive `findAllMedia` function (using `TreeWalker`) into the string-based evaluation script within `CdpTimeDriver.setTime`. This avoids importing runtime code into the browser context while ensuring deep discovery.
- **Pseudo-Code**:
  ```javascript
  // Inside setTime() string template:

  // 1. Define recursive finder
  function findAllMedia(rootNode) {
    const media = [];
    if (rootNode is AUDIO or VIDEO) media.push(rootNode);

    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node is AUDIO or VIDEO) media.push(node);
      if (node.shadowRoot) {
        media.push(...findAllMedia(node.shadowRoot));
      }
    }
    return media;
  }

  // 2. Use it
  const mediaElements = findAllMedia(document);

  // 3. Iterate and Sync (existing logic)
  mediaElements.forEach(el => {
    // pause, calculate targetTime, set currentTime
  });
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-cdp-shadow-dom.ts`
- **Success Criteria**: The verification script must confirm that a video element *inside* a Shadow Root has its `currentTime` updated to match the driver's virtual time (within a small delta).
- **Edge Cases**:
  - Nested Shadow DOMs (handled by recursion).
  - Mixed Light DOM and Shadow DOM media (handled by `findAllMedia`).
