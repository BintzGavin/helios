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
