export const FIND_DEEP_ELEMENT_SCRIPT = `
  (root, selector) => {
    function findRecursive(currentNode, selector) {
      // Fast path for Light DOM (if querySelector is available)
      // This helps performance for simple cases, but won't find things in Shadow DOM
      // or inside the shadow root we are currently traversing if we don't call it on the shadow root.
      // However, root.querySelector works on Document and Element and ShadowRoot.

      if (currentNode.querySelector) {
        try {
          const light = currentNode.querySelector(selector);
          if (light) return light;
        } catch (e) {
          // Ignore invalid selector errors
        }
      }

      // Recursive traversal using TreeWalker to find Shadow Roots
      // TreeWalker does not automatically enter Shadow Roots, so we must manually check.
      // Also, we need to check if we are currently looking at an element that matches?
      // No, querySelector above covers the current scope's light DOM.
      // We only need TreeWalker to find elements that HAVE shadow roots.

      const walker = document.createTreeWalker(currentNode, NodeFilter.SHOW_ELEMENT);
      while (walker.nextNode()) {
        const node = walker.currentNode;

        // If this node has a shadow root, recurse into it
        if (node.shadowRoot) {
          const found = findRecursive(node.shadowRoot, selector);
          if (found) return found;
        }
      }
      return null;
    }

    return findRecursive(root, selector);
  }
`;
