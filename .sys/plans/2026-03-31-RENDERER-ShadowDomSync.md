# Enable Shadow DOM Media Sync in SeekTimeDriver

#### 1. Context & Goal
- **Objective**: Update `SeekTimeDriver` to correctly discover and synchronize `<video>` and `<audio>` elements located within Shadow DOMs, ensuring deterministic rendering for Web Component-based compositions.
- **Trigger**: The current implementation uses `document.querySelectorAll('video, audio')` which fails to find media elements inside Shadow DOMs, causing them to drift or fail to seek during rendering.
- **Impact**: Enables robust rendering of modern web applications and components that use Shadow DOM encapsulation for media elements.

#### 2. File Inventory
- **Create**: `packages/renderer/tests/verify-shadow-dom-sync.ts` (Verification script for Shadow DOM media sync)
- **Modify**: `packages/renderer/src/drivers/SeekTimeDriver.ts` (Implement recursive media discovery)
- **Read-Only**: `packages/renderer/src/utils/dom-scanner.ts` (Reference for `findAllMedia` logic)

#### 3. Implementation Spec
- **Architecture**: In-page Script Injection. The `setTime` method injects a script into the browser context. This script will be updated to include a recursive `findAllMedia` function (similar to `dom-scanner.ts`) to traverse the DOM tree, including Shadow Roots.
- **Pseudo-Code**:
  ```javascript
  // In SeekTimeDriver.setTime injected script:

  FUNCTION findAllMedia(rootNode):
    CALCULATE media list = []
    IF rootNode is Element AND (tagName is VIDEO or AUDIO):
      ADD rootNode to media list

    CREATE TreeWalker for rootNode
    WHILE walker.nextNode():
      IF node is VIDEO or AUDIO:
        ADD node to media list
      IF node.shadowRoot:
        ADD findAllMedia(node.shadowRoot) to media list
    RETURN media list

  // Main Logic
  SET t = targetTime
  SET mediaElements = findAllMedia(document) // Was document.querySelectorAll

  FOR EACH element IN mediaElements:
    CALL element.pause()
    CALCULATE targetTime = t - offset + seek
    SET element.currentTime = targetTime
    IF element.seeking OR not ready:
      WAIT for 'seeked' event
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-shadow-dom-sync.ts`
- **Success Criteria**:
  - The verification script creates a Custom Element with a `<video>` in its Shadow DOM.
  - The script uses `SeekTimeDriver` to set time to `5.0`.
  - The script asserts that `video.currentTime` is `5.0` (within a small delta).
- **Edge Cases**:
  - Nested Shadow DOMs (Shadow inside Shadow).
  - Media elements with `data-helios-offset` inside Shadow DOM.
