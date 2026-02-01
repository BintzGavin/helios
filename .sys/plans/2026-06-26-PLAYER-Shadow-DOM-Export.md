# 2026-06-26-PLAYER-Shadow-DOM-Export

#### 1. Context & Goal
- **Objective**: Enable Client-Side Export (DOM Mode) to support Web Components by ensuring Shadow DOM content and styles are preserved.
- **Trigger**: The current implementation uses `cloneNode(true)` and `XMLSerializer`, which ignores Shadow DOM. This causes compositions using Web Components (including Helios's own UI elements if exported) to render incorrectly or missing styles/content.
- **Impact**: Unlocks full support for "Native Always Wins" vision by supporting standard Web Components in exports.

#### 2. File Inventory
- **Modify**: `packages/player/src/features/dom-capture.ts`
  - Replace `cloneNode(true)` with a custom `cloneWithShadow` function.
  - Update `inlineImages`, `inlineCanvases`, `inlineVideos` to traverse into `<template>` elements.
- **Modify**: `packages/player/src/features/dom-capture.test.ts`
  - Add test case for Shadow DOM capture.

#### 3. Implementation Spec
- **Architecture**:
  - **Transformation**: Instead of writing a custom serializer, we will transform the "Live Shadow DOM" into "Declarative Shadow DOM" (`<template shadowrootmode="open">`) during the cloning phase.
  - **Serialization**: This allows us to keep using the standard `XMLSerializer` to generate the final SVG string.
  - **Asset Inlining**: Update asset inlining functions to traverse recursively into `HTMLTemplateElement.content`.

- **Pseudo-Code**:
  ```typescript
  function cloneWithShadow(node: Node): Node {
    const clone = node.cloneNode(false); // Shallow clone

    // 1. Handle Shadow DOM
    if (node instanceof Element && node.shadowRoot) {
      const template = document.createElement('template');
      // Only process open shadow roots or those we can access.
      // Note: Closed shadow roots return null for .shadowRoot, so they are naturally skipped.

      template.setAttribute('shadowrootmode', node.shadowRoot.mode);

      // Serialize adoptedStyleSheets
      if (node.shadowRoot.adoptedStyleSheets && node.shadowRoot.adoptedStyleSheets.length > 0) {
         // Create <style> tags for each sheet by reading .cssRules (if accessible)
         // Note: Might need try-catch for CORS restrictions on CSSRules
      }

      // Clone shadow children into template content
      for (const child of node.shadowRoot.childNodes) {
        template.content.appendChild(cloneWithShadow(child));
      }

      clone.appendChild(template);
    }

    // 2. Handle Light DOM Children
    for (const child of node.childNodes) {
       clone.appendChild(cloneWithShadow(child));
    }

    return clone;
  }

  // Update inlining functions to traverse templates
  function traverseAndInline(root) {
     // If root is HTMLTemplateElement, traverse root.content
     // Process current node (inline if matches)
     // Recurse children
  }
  ```

- **Public API Changes**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - New test case creates a custom element with Shadow DOM (containing styles and elements).
  - Captures it using `dom-capture`.
  - Verifies the resulting SVG string contains `<template shadowrootmode="open">` and the expected internal content.
- **Edge Cases**:
  - Nested Shadow DOM.
  - `adoptedStyleSheets` serialization.
  - Slots (Distributed nodes remain in Light DOM, but we need to ensure they are cloned correctly. `cloneWithShadow` handles Light DOM children so slots should work natively via the browser's composition).
