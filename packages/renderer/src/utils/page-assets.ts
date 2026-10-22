/** Assets a page asked for that did not arrive, as seen from inside the page. */
export interface PageAssets {
  /** `<img>` elements (shadow roots included) that finished loading without an image. */
  brokenImages: string[];
  /** `@font-face` families whose file failed to load or parse; text falls back to another font. */
  failedFonts: string[];
  /** Requests the server answered with HTTP 400 or above (the page itself, images, fonts, CSS, scripts, fetches). */
  failedRequests: Array<{ url: string; status: number }>;
}

/**
 * Evaluated in the page after a seek. A string, not a function: transpilers can inject
 * helpers that do not exist in the page. Lazy images still loading are not counted.
 * Request status comes from Resource Timing, so a request the network refused outright
 * (status 0) is left out: it cannot be told apart from an opaque cross-origin response.
 */
export const PAGE_ASSETS_SCRIPT = `(() => {
  const images = [];
  const walk = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node instanceof HTMLImageElement && node.complete && node.naturalWidth === 0) {
        const src = node.currentSrc || node.getAttribute('src');
        if (src) images.push(node.currentSrc || node.src);
      }
      if (node.shadowRoot) walk(node.shadowRoot);
    }
  };
  walk(document);
  const fonts = Array.from(document.fonts)
    .filter((face) => face.status === 'error')
    .map((face) => face.family.replace(/^["']|["']$/g, ''));
  // The page's own response counts too: a mistyped path serves an empty 404 page.
  const requests = [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')]
    .filter((entry) => typeof entry.responseStatus === 'number' && entry.responseStatus >= 400)
    .map((entry) => ({ url: entry.name, status: entry.responseStatus }));
  return { brokenImages: images, failedFonts: fonts, failedRequests: requests };
})()`;

/** Joins per-frame readings, keeping the first sighting of each asset. */
export function mergePageAssets(readings: PageAssets[]): PageAssets {
  const images = new Set<string>();
  const fonts = new Set<string>();
  const requests = new Map<string, { url: string; status: number }>();
  for (const reading of readings) {
    reading.brokenImages.forEach((src) => images.add(src));
    reading.failedFonts.forEach((family) => fonts.add(family));
    for (const request of reading.failedRequests) if (!requests.has(request.url)) requests.set(request.url, request);
  }
  return { brokenImages: [...images], failedFonts: [...fonts], failedRequests: [...requests.values()] };
}
