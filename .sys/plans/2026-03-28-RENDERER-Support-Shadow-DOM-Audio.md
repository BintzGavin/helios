# Plan: Support Shadow DOM Audio Discovery

## 1. Context & Goal
- **Objective**: Update the implicit audio discovery mechanism to detect `<video>` and `<audio>` elements encapsulated within Shadow DOM trees.
- **Trigger**: "Implicit Audio Discovery" currently uses `document.querySelectorAll` which does not penetrate Shadow DOM, failing to detect media in Web Components (a common pattern in modern web apps).
- **Impact**: Enables `DomStrategy` and `CanvasStrategy` to correctly include audio tracks from modern web applications using Shadow DOM, ensuring "Use What You Know" works for all architectures.

## 2. File Inventory
- **Create**: `packages/renderer/tests/verify-shadow-dom-audio.ts` (New test case to verify Shadow DOM support)
- **Modify**: `packages/renderer/src/utils/dom-scanner.ts` (Implement recursive DOM traversal)
- **Read-Only**: `packages/renderer/src/strategies/DomStrategy.ts`

## 3. Implementation Spec
- **Architecture**: Refactor the browser-side script injected by `scanForAudioTracks` to use a recursive traversal function instead of a flat `querySelectorAll`.
- **Pseudo-Code**:
  ```javascript
  // In packages/renderer/src/utils/dom-scanner.ts

  FUNCTION getAllMediaElements(rootNode):
    // 1. Get media in current root
    CALCULATE media = Array.from(rootNode.querySelectorAll('video, audio'))

    // 2. Get all elements that might have a shadowRoot
    CALCULATE allElements = rootNode.querySelectorAll('*')

    FOR each element IN allElements:
      IF element.shadowRoot exists:
        // Recursively search the shadow root
        CALCULATE shadowMedia = getAllMediaElements(element.shadowRoot)
        APPEND shadowMedia TO media

    RETURN media

  // Replace existing querySelectorAll usage:
  // const mediaElements = getAllMediaElements(document);
  ```
- **Public API Changes**: None (Internal utility update).
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npx tsx packages/renderer/tests/verify-shadow-dom-audio.ts`
- **Success Criteria**:
  - The test script must create a page with a Custom Element containing a Shadow Root.
  - Inside the Shadow Root, place an `<audio src="...">`.
  - The script calls `DomStrategy.prepare(page)` or uses the scanner directly.
  - Assert that `getFFmpegArgs` includes the audio source from the Shadow DOM.
- **Edge Cases**:
  - Nested Shadow DOMs (Shadow within Shadow).
  - 'Open' Shadow Roots (Closed roots are inaccessible and out of scope).
