# Context & Goal
- **Objective**: Update `CdpTimeDriver` (used by Canvas Strategy) to recursively traverse Shadow DOMs to find and synchronize `<video>` and `<audio>` elements.
- **Trigger**: Vision gap identified in [1.44.0] and verified by code inspection: `CdpTimeDriver` uses `document.querySelectorAll` which ignores Shadow DOM content, causing synchronization failures for Web Components in Canvas mode.
- **Impact**: Ensures that compositions using Web Components with media elements render correctly in Canvas mode (WebCodecs), maintaining the "Dual-Path Architecture" promise.

# File Inventory
- **Modify**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
  - Update `setTime` to use recursive Shadow DOM traversal.
- **Create**: `packages/renderer/tests/verify-cdp-shadow-dom.ts`
  - New verification script to confirm Shadow DOM media sync in CDP mode.
- **Read-Only**: `packages/renderer/src/utils/dom-scanner.ts` (Reference for `findAllMedia` logic), `packages/renderer/tests/verify-cdp-media-offsets.ts` (Reference for test).

# Implementation Spec
- **Architecture**: Inline a `findAllMedia(rootNode)` helper function into the `CdpTimeDriver.setTime` injected script string. This function will use `document.createTreeWalker` to traverse elements and recursively enter `shadowRoot` to collect all `AUDIO` and `VIDEO` elements.
- **Pseudo-Code (CdpTimeDriver.ts)**:
  - In `setTime(page, timeInSeconds)`:
    - Define `script` string:
      - Define `findAllMedia(root)` function:
        - Create array `media = []`.
        - Check if `root` is AUDIO/VIDEO, add to `media`.
        - Create `TreeWalker` for `root`.
        - While `walker.nextNode()`:
          - If node is AUDIO/VIDEO, add to `media`.
          - If node has `shadowRoot`, recursively call `findAllMedia(node.shadowRoot)` and append to `media`.
        - Return `media`.
      - Call `const mediaElements = findAllMedia(document);`
      - Iterate `mediaElements`:
        - `el.pause()`
        - Calculate `offset`, `seek`.
        - `el.currentTime = Math.max(0, t - offset + seek)`
        - Do NOT await `seeked` (avoid deadlock).
      - Call `window.helios.waitUntilStable()` if exists.
    - `await page.evaluate(script)`
- **Dependencies**: None.

# Test Plan
- **Verification**: `npx ts-node packages/renderer/tests/verify-cdp-shadow-dom.ts`
- **Success Criteria**:
  - The test script must create a Web Component with a video in its Shadow DOM.
  - It must verify that `video.currentTime` updates correctly when `driver.setTime` is called.
  - It must verify that `data-helios-offset` is respected inside the Shadow DOM.
- **Edge Cases**:
  - Deeply nested Shadow DOMs.
  - Mixed light DOM and Shadow DOM media.
