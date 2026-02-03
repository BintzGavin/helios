# Context & Goal
- **Objective**: Enhance `DomStrategy` to recursively discover and preload background images and masks used in CSS pseudo-elements (`::before`, `::after`).
- **Trigger**: Vision Gap ("Zero-Artifact Rendering"). Current implementation misses assets defined only in pseudo-elements, leading to potential visual glitches in the first rendered frame.
- **Impact**: Ensures robust rendering for modern, CSS-heavy compositions that rely on pseudo-elements for decoration.

# File Inventory
- **Create**: `packages/renderer/tests/verify-pseudo-element-preload.ts`
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts`
- **Read-Only**: `packages/renderer/tests/verify-enhanced-dom-preload.ts`

# Implementation Spec
- **Architecture**: Update the `findAllElements` traversal loop in the `DomStrategy.prepare` injected script. Currently, it iterates over all elements and checks `window.getComputedStyle(el)`. The enhanced version will iterate over `[null, '::before', '::after']` for each element to capture styles from pseudo-elements as well.
- **Pseudo-Code**:
  ```javascript
  // Inside DomStrategy.prepare() injected script

  const allElements = findAllElements(document);
  const backgroundUrls = new Set();

  allElements.forEach((el) => {
    // Check the element itself (null) and its pseudo-elements
    const targets = [null, '::before', '::after'];

    targets.forEach(pseudo => {
      const style = window.getComputedStyle(el, pseudo);
      const props = ['backgroundImage', 'maskImage', 'webkitMaskImage'];

      props.forEach(prop => {
        const val = style[prop];
        if (val && val !== 'none') {
          // Extract URLs from "url('...')"
          const matches = val.matchAll(/url\((['"]?)(.*?)\1\)/g);
          // Add to backgroundUrls
        }
      });
    });
  });

  // Proceed to preload all found URLs using Image() objects
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

# Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-pseudo-element-preload.ts`
- **Success Criteria**:
  1. The test script launches a browser and intercepts network requests.
  2. It injects HTML with a `div::before` rule containing a unique background image (e.g., `pseudo-bg.png`).
  3. It calls `DomStrategy.prepare(page)`.
  4. It asserts that the network interceptor received a request for `pseudo-bg.png`.
  5. It asserts that `DomStrategy` logged a message indicating discovery (e.g., "Preloading 1 background images").
- **Edge Cases**:
  - Elements without pseudo-elements (should not error).
  - Pseudo-elements with `content: none` but `background-image` set (should ideally still preload if browser reports style).
  - Pseudo-elements with inherited backgrounds.
