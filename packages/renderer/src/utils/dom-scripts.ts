export const FIND_ALL_MEDIA_FUNCTION = `
  function findAllMedia(rootNode, mediaArray) {
    const media = mediaArray || [];
    if (rootNode.nodeType === Node.ELEMENT_NODE && !mediaArray) {
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
        findAllMedia(node.shadowRoot, media);
      }
    }
    return media;
  }
`;

export const FIND_ALL_IMAGES_FUNCTION = `
  function findAllImages(root, imagesArray) {
    const images = imagesArray || [];
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
        findAllImages(node.shadowRoot, images);
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
  function findAllScopes(rootNode, scopesArray) {
    const scopes = scopesArray || [];
    if (!scopesArray) {
        scopes.push(rootNode);
    }
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.shadowRoot) {
        scopes.push(node.shadowRoot);
        findAllScopes(node.shadowRoot, scopes);
      }
    }
    return scopes;
  }
`;

export const PARSE_MEDIA_ATTRIBUTES_FUNCTION = `
  function parseMediaAttributes(el) {
    const offset = el.dataset.heliosOffset ? parseFloat(el.dataset.heliosOffset) : 0;
    const seek = el.dataset.heliosSeek ? parseFloat(el.dataset.heliosSeek) : 0;
    const fadeIn = el.dataset.heliosFadeIn ? parseFloat(el.dataset.heliosFadeIn) : 0;
    const fadeOut = el.dataset.heliosFadeOut ? parseFloat(el.dataset.heliosFadeOut) : 0;
    const volume = el.muted ? 0 : el.volume;
    const loop = el.loop;
    const duration = el.duration;

    let rate = el.playbackRate;
    if (rate === 1.0) {
      const rateAttr = el.getAttribute('playbackRate');
      if (rateAttr) {
        const parsed = parseFloat(rateAttr);
        if (!isNaN(parsed)) {
          rate = parsed;
        }
      }
    }
    if (isNaN(rate) || rate <= 0) {
      rate = 1.0;
    }

    return {
      offset: isNaN(offset) ? 0 : offset,
      seek: isNaN(seek) ? 0 : seek,
      fadeIn: isNaN(fadeIn) ? 0 : fadeIn,
      fadeOut: isNaN(fadeOut) ? 0 : fadeOut,
      volume,
      loop,
      playbackRate: rate,
      duration: (Number.isFinite(duration) && duration > 0) ? duration : undefined
    };
  }
`;

export const SYNC_MEDIA_FUNCTION = `
  function syncMedia(el, globalTime) {
    const attrs = parseMediaAttributes(el);

    // Calculate target time
    // Formula: (GlobalTime - Offset) * Rate + Seek
    let targetTime = Math.max(0, (globalTime - attrs.offset) * attrs.playbackRate + attrs.seek);

    // Handle Looping
    if (attrs.loop && attrs.duration && targetTime > attrs.duration) {
      targetTime = targetTime % attrs.duration;
    }

    el.pause();
    el.currentTime = targetTime;
  }
`;
