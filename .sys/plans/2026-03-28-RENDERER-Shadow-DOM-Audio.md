# Context & Goal
- **Objective**: Update the DOM scanner to recursively traverse Shadow DOM trees to discover `<audio>` and `<video>` elements.
- **Trigger**: The current implementation of `scanForAudioTracks` uses `document.querySelectorAll`, which does not penetrate Shadow Roots. This causes the renderer to miss audio tracks contained within Web Components, creating a gap in the "Deep DOM Strategy" vision.
- **Impact**: Enables robust audio mixing for modern applications using encapsulated components.

# File Inventory
- **Modify**: `packages/renderer/src/utils/dom-scanner.ts`
  - Update `scanForAudioTracks` script to use recursive traversal.
- **Create**: `packages/renderer/tests/verify-shadow-dom-audio.ts`
  - Integration test to verify discovery of media in Shadow DOM.

# Implementation Spec
- **Architecture**: Refactor the scanning logic to use a recursive traversal function (helper within the injected script) instead of a flat selector.
- **Pseudo-Code**:
  ```javascript
  // Inside the injected script in dom-scanner.ts

  function findAllMedia(rootNode) {
    const media = [];
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT);

    // Check the root itself
    if (rootNode.tagName === 'AUDIO' || rootNode.tagName === 'VIDEO') media.push(rootNode);

    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
        media.push(node);
      }
      if (node.shadowRoot) {
        // Recursively find in shadow root
        media.push(...findAllMedia(node.shadowRoot));
      }
    }
    return media;
  }

  // Replace 'document.querySelectorAll' with:
  const mediaElements = findAllMedia(document.body);
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

# Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-shadow-dom-audio.ts`
- **Success Criteria**:
  - The test launches a Playwright instance.
  - It injects a custom Web Component with an open Shadow Root containing an `<audio>` tag.
  - It calls `scanForAudioTracks`.
  - It asserts that the returned list contains the audio track from the Shadow DOM.
