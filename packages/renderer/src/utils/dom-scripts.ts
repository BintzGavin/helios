export const FIND_ALL_MEDIA_FUNCTION = `
  function findAllMedia(rootNode) {
    const media = [];
    // Check rootNode (if it is an Element)
    if (rootNode.nodeType === Node.ELEMENT_NODE) {
      const tagName = rootNode.tagName;
      if (tagName === 'AUDIO' || tagName === 'VIDEO') {
        media.push(rootNode);
      }
    }

    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
        media.push(node);
      }
      if (node.shadowRoot) {
        media.push(...findAllMedia(node.shadowRoot));
      }
    }
    return media;
  }
`;

export const FIND_ALL_IMAGES_FUNCTION = `
  function findAllImages(root) {
    const images = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.tagName === 'IMG') {
        images.push(node);
      }
      // Check for VIDEO poster
      if (node.tagName === 'VIDEO' && node.poster) {
        const img = new Image();
        img.src = node.poster;
        images.push(img);
      }
      // Check for SVG IMAGE
      if (node.tagName === 'image' || node.tagName === 'IMAGE') {
        const href = node.getAttribute('href') || node.getAttribute('xlink:href');
        if (href) {
          const img = new Image();
          img.src = href;
          images.push(img);
        }
      }
      if (node.shadowRoot) {
        images.push(...findAllImages(node.shadowRoot));
      }
    }
    return images;
  }
`;

export const FIND_ALL_ELEMENTS_WITH_PSEUDO_FUNCTION = `
  function findAllElements(root, elements) {
    elements = elements || [];
    if (root.nodeType === Node.ELEMENT_NODE) {
      elements.push(root);
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      elements.push(node);
      if (node.shadowRoot) {
        findAllElements(node.shadowRoot, elements);
      }
    }
    return elements;
  }
`;

export const FIND_ALL_SCOPES_FUNCTION = `
  function findAllScopes(rootNode) {
    const scopes = [rootNode];
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.shadowRoot) {
        scopes.push.apply(scopes, findAllScopes(node.shadowRoot));
      }
    }
    return scopes;
  }
`;
