# 1. Context & Goal
- **Objective**: Enable recursive discovery and preloading of `<img>` elements within Shadow DOMs in `DomStrategy`.
- **Trigger**: Vision gap. `DomStrategy` currently uses `document.images` which is shallow and misses images inside Web Components, violating the "Zero-artifact rendering" goal.
- **Impact**: Ensures that images nested within Shadow DOMs are fully loaded before rendering starts, preventing blank or partial frames in the final video.

# 2. File Inventory
- **Create**: `packages/renderer/tests/verify-shadow-dom-images.ts` (Verification script to test nested image discovery)
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts` (Update `prepare` method to use recursive search)
- **Read-Only**: `packages/renderer/src/utils/dom-scanner.ts` (Reference for recursive traversal pattern)

# 3. Implementation Spec
- **Architecture**: Update the client-side script injected by `DomStrategy.prepare`. Replace the shallow `document.images` collection with a recursive `TreeWalker` traversal that crosses Shadow DOM boundaries, similar to how `scanForAudioTracks` works.
- **Pseudo-Code**:
  ```javascript
  FUNCTION findAllImages(rootNode):
      CALCULATE images = []
      IF rootNode is IMG:
          APPEND rootNode to images

      CREATE TreeWalker for rootNode (SHOW_ELEMENT)
      WHILE walker.nextNode():
          IF currentNode is IMG:
              APPEND currentNode to images
          IF currentNode.shadowRoot:
              CALCULATE shadowImages = CALL findAllImages(currentNode.shadowRoot)
              APPEND shadowImages to images
      RETURN images

  IN injected script:
      CALCULATE allImages = CALL findAllImages(document)
      LOG "Found X images"

      FOR EACH img IN allImages:
          IF img.complete CONTINUES
          WAIT for img.onload OR img.onerror
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

# 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-shadow-dom-images.ts`
- **Success Criteria**:
    1. The verification script intercepts browser console logs.
    2. It confirms that `DomStrategy` logs a message indicating it found the expected number of images (including those in Shadow DOM).
    3. The script passes with exit code 0.
- **Edge Cases**:
    - Nested Shadow DOMs (Shadow inside Shadow).
    - Images that fail to load (should not block indefinitely).
