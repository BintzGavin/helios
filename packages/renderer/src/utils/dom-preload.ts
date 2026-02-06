export const PRELOAD_SCRIPT = `
(async (timeoutMs) => {
  // Helper: withTimeout
  const withTimeout = (promise, msg) => {
     let timeoutId;
     const timeoutPromise = new Promise(r => {
       timeoutId = setTimeout(() => {
         console.warn(msg);
         r();
       }, timeoutMs);
     });
     return Promise.race([
        promise.finally(() => clearTimeout(timeoutId)),
        timeoutPromise
     ]);
  };

  // 1. Wait for fonts
  await withTimeout(document.fonts.ready, '[Helios Preload] Timeout waiting for fonts');

  // 2. Wait for images (IMG tags, Video posters, SVG images)
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

  const images = findAllImages(document);
  if (images.length > 0) {
    console.log('[Helios Preload] Preloading ' + images.length + ' images...');
    const loadPromise = Promise.all(images.map((img) => {
      if (img.complete) return;
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve; // Don't block on broken images
      });
    }));
    await withTimeout(loadPromise, '[Helios Preload] Timeout waiting for images');
  }

  // 3. Wait for CSS background images and masks
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

  const allElements = findAllElements(document);
  const backgroundUrls = new Set();

  allElements.forEach((el) => {
    const targets = [null, '::before', '::after'];

    targets.forEach(pseudo => {
      const style = window.getComputedStyle(el, pseudo);
      const props = ['backgroundImage', 'maskImage', 'webkitMaskImage'];

      props.forEach(prop => {
        const val = style[prop];
        if (val && val !== 'none') {
          // Extract URLs from "url('...'), url("...")"
          const matches = val.matchAll(/url\\((['"]?)(.*?)\\1\\)/g);
          for (const match of matches) {
            if (match[2]) {
              backgroundUrls.add(match[2]);
            }
          }
        }
      });
    });
  });

  if (backgroundUrls.size > 0) {
    console.log('[Helios Preload] Preloading ' + backgroundUrls.size + ' background images...');
    const loadPromise = Promise.all(Array.from(backgroundUrls).map((url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(undefined);
        img.onerror = () => {
          console.warn('[Helios Preload] Failed to preload background image: ' + url);
          resolve(undefined); // Don't block
        };
        img.src = url;
        if (img.complete) resolve(undefined);
      });
    }));
    await withTimeout(loadPromise, '[Helios Preload] Timeout waiting for background images');
  }
})
`;
