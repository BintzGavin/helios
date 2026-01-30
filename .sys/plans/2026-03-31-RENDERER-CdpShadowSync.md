# 📋 RENDERER: Enable Shadow DOM Media Sync in CdpTimeDriver

#### 1. Context & Goal
- **Objective**: Update `CdpTimeDriver` to recursively discover and synchronize `<video>` and `<audio>` elements within Shadow DOMs, ensuring parity with `SeekTimeDriver` and fulfilling the "Dual-Path Architecture" vision.
- **Trigger**: Vision Gap identified in journal (`[1.44.0] - CdpTimeDriver Shadow DOM Gap`) - Canvas mode (using `CdpTimeDriver`) fails to synchronize media inside Shadow DOMs because it relies on light-DOM-only queries (`document.querySelectorAll`).
- **Impact**: Enables accurate rendering of Web Components containing media elements when using the Canvas renderer, ensuring consistent behavior across both rendering modes.

#### 2. File Inventory
- **Create**:
  - `packages/renderer/tests/verify-cdp-shadow-dom-sync.ts`: A new verification script based on `verify-shadow-dom-sync.ts` but using `CdpTimeDriver` to validate Shadow DOM media synchronization in Canvas mode.
- **Modify**:
  - `packages/renderer/src/drivers/CdpTimeDriver.ts`: Update the `setTime` method to inject a recursive media discovery function (using `TreeWalker`) instead of a simple `querySelectorAll`.
- **Read-Only**:
  - `packages/renderer/src/drivers/SeekTimeDriver.ts`: Reference for the recursive traversal implementation.

#### 3. Implementation Spec
- **Architecture**:
  - The `CdpTimeDriver` will adopt the same recursive DOM traversal logic used in `SeekTimeDriver` to find media elements across all Shadow Roots.
  - The logic will be injected as a string into the browser context via `page.evaluate`.
  - The synchronization logic must continue to avoid awaiting async events (like `seeked`) to prevent deadlocks with CDP's virtual time policy.
- **Pseudo-Code**:
  ```javascript
  // Inside CdpTimeDriver.setTime(page, timeInSeconds)

  // Define recursive helper inside the evaluated script string
  FUNCTION findAllMedia(rootNode)
    CREATE media list
    IF rootNode is AUDIO or VIDEO THEN add to list
    CREATE TreeWalker for rootNode
    WHILE walker.nextNode()
      IF node is AUDIO or VIDEO THEN add to list
      IF node has shadowRoot THEN recursively call findAllMedia(node.shadowRoot)
    RETURN media list

  // Replace document.querySelectorAll('video, audio') with:
  SET mediaElements = findAllMedia(document)

  FOR EACH element in mediaElements:
    CALL element.pause()
    // Calculate target time (using data-helios-offset/seek)
    SET element.currentTime = calculatedTime
    // CRITICAL: Do NOT await 'seeked' event (CDP virtual time prevents this)
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npx tsx packages/renderer/tests/verify-cdp-shadow-dom-sync.ts`
- **Success Criteria**:
  - The script should output `✅ SUCCESS: Shadow DOM video synced to ~0.5s.`
  - Both the regular video and the Shadow DOM video must report a `currentTime` close to the target time (within 0.05s tolerance).
- **Edge Cases**:
  - Verify that regular (light DOM) videos still sync correctly.
  - Verify that offsets and seek attributes are respected (covered by existing logic, but preserved).
