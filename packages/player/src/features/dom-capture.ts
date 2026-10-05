/**
 * Fetched assets, keyed by URL: data: URIs for images and fonts, CSS text for stylesheets.
 * Pass one Map for every frame of an export so each URL is fetched once.
 */
export type DomCaptureCache = Map<string, Promise<string>>;

export interface DomCaptureOptions {
  targetWidth?: number;
  targetHeight?: number;
  cache?: DomCaptureCache;
}

/**
 * The SVG image has no animation timeline: a CSS animation in it restarts at 0 and a WAAPI
 * animation is lost. Animated values are written inline on the clone (freezeAnimations), and
 * this switches every animation and transition off inside the image.
 */
const FREEZE_ANIMATIONS_CSS = '*, *::before, *::after { animation: none !important; transition: none !important; }';

export async function captureDomToBitmap(element: HTMLElement, options?: DomCaptureOptions): Promise<ImageBitmap> {
  const doc = element.ownerDocument || document;
  const cache: DomCaptureCache = options?.cache ?? new Map();

  // 1. Clone & Inline Assets
  let clone = cloneWithShadow(element) as HTMLElement;
  await inlineImages(element, clone, cache);
  clone = inlineCanvases(element, clone);
  clone = inlineVideos(element, clone);
  inlineFormValues(element, clone);
  freezeAnimations(element, clone);

  // 2. Serialize DOM
  const serializer = new XMLSerializer();
  const html = serializer.serializeToString(clone);

  // 3. Collect styles
  // We collect all style tags to ensure CSS-in-JS and other styles are preserved.
  // Each is serialized as XML, so CSS containing & or < can't break the SVG.
  const styleElements = Array.from(doc.querySelectorAll('style'));
  const inlineStylesPromises = styleElements.map(async (style) => {
    const css = style.textContent || '';
    const processed = await processCss(css, doc.baseURI, cache);
    const styleClone = style.cloneNode(true) as HTMLStyleElement;
    styleClone.textContent = processed;
    return serializer.serializeToString(styleClone);
  });

  const inlineStyles = (await Promise.all(inlineStylesPromises)).join('\n');

  // Fetch and inline external stylesheets
  const externalStyles = await getExternalStyles(doc, cache);
  const styles = externalStyles + '\n' + inlineStyles + `\n<style>${FREEZE_ANIMATIONS_CSS}</style>`;

  // 4. Determine dimensions
  // Use target dimensions if provided, otherwise scroll dimensions or defaults.
  const width = options?.targetWidth || element.scrollWidth || element.offsetWidth || 1920;
  const height = options?.targetHeight || element.scrollHeight || element.offsetHeight || 1080;

  // 5. Construct SVG
  // We wrap the content in a div to ensure block formatting context.
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width: 100%; height: 100%;">
          ${styles}
          ${html}
        </div>
      </foreignObject>
    </svg>
  `;

  // 6. Load Image
  // From a data: URL, not a blob: URL: Chromium taints a foreignObject SVG loaded from a blob:
  // URL, and VideoFrame refuses tainted sources.
  const img = new Image();

  // Return a promise that resolves when the image loads
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => reject(new Error('Failed to load SVG image for DOM capture'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });

  // 7. Create ImageBitmap
  // Through a canvas: an ImageBitmap made straight from the image is tainted even from a data: URL.
  const canvas = doc.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return createImageBitmap(img);
  ctx.drawImage(img, 0, 0, width, height);
  return createImageBitmap(canvas);
}

/** Text safe inside an XML element or comment: the SVG is parsed as XML, so & and < must be escaped. */
function escapeXmlText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Fetches once per cache; a failure is dropped from the cache so the next frame retries. */
function cached(cache: DomCaptureCache, key: string, load: () => Promise<string>): Promise<string> {
  let p = cache.get(key);
  if (!p) {
    p = load();
    cache.set(key, p);
    p.catch(() => { if (cache.get(key) === p) cache.delete(key); });
  }
  return p;
}

function fetchText(url: string, cache: DomCaptureCache): Promise<string> {
  return cached(cache, 'text:' + url, async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    return response.text();
  });
}

async function getExternalStyles(doc: Document, cache: DomCaptureCache): Promise<string> {
  const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
  const promises = links.map(async (link) => {
    try {
      // Skip if no href
      if (!link.href) return '';

      const processed = await processCss(await fetchText(link.href, cache), link.href, cache);
      // A Google Fonts href has '&'; "*/" in an href would end the comment early.
      const label = escapeXmlText(link.href.replace(/\*\//g, '*\\/'));
      return `<style>/* ${label} */\n${escapeXmlText(processed)}</style>`;
    } catch (e) {
      console.warn('Helios: Failed to inline stylesheet:', link.href, e);
      return '';
    }
  });
  return (await Promise.all(promises)).join('\n');
}

/** @import url(x) / @import "x", with optional conditions, at the top level of a stylesheet. */
const IMPORT_REGEX = /@import\s+(?:url\(\s*(['"]?)([^'")]+)\1\s*\)|(['"])([^'"]+)\3)\s*([^;]*);/g;
const MAX_IMPORT_DEPTH = 4;

/**
 * Replaces each @import with the imported stylesheet's text, itself processed, so the fonts and
 * images it names become data: URIs too. An image can't fetch anything, so an @import left in
 * place (or turned into a data: URI with its font URLs still remote) loses the web font.
 */
async function inlineImports(css: string, baseUrl: string, cache: DomCaptureCache, depth: number): Promise<string> {
  const matches = Array.from(css.matchAll(IMPORT_REGEX));
  if (!matches.length) return css;
  const replacements = await Promise.all(matches.map(async (match) => {
    const href = match[2] ?? match[4];
    const conditions = match[5].trim();
    // layer() and supports() imports have no simple inline form: keep them.
    if (depth >= MAX_IMPORT_DEPTH || /^(layer|supports)\b/i.test(conditions)) return null;
    try {
      const url = new URL(href, baseUrl).href;
      const text = await processCss(await fetchText(url, cache), url, cache, depth + 1);
      return { original: match[0], replacement: conditions ? `@media ${conditions} {\n${text}\n}` : text };
    } catch (e) {
      console.warn('Helios: Failed to inline @import:', href, e);
      return null;
    }
  }));
  let out = css;
  for (const r of replacements) if (r) out = out.split(r.original).join(r.replacement);
  return out;
}

async function processCss(css: string, baseUrl: string, cache: DomCaptureCache, depth = 0): Promise<string> {
  css = await inlineImports(css, baseUrl, cache, depth);
  const urlRegex = /url\((?:['"]?)(.*?)(?:['"]?)\)/g;
  const matches = Array.from(css.matchAll(urlRegex));

  const replacementsPromises = matches.map(async (match) => {
    const originalMatch = match[0];
    const url = match[1];

    if (url.startsWith('data:')) return null;

    try {
      const absoluteUrl = new URL(url, baseUrl).href;
      const dataUri = await fetchAsDataUri(absoluteUrl, cache);
      return {
        original: originalMatch,
        replacement: `url("${dataUri}")`,
      };
    } catch (e) {
      console.warn(`Helios: Failed to inline CSS asset: ${url}`, e);
      return null;
    }
  });

  const replacements = (await Promise.all(replacementsPromises)).filter(
    (r): r is { original: string; replacement: string } => r !== null
  );

  let processedCss = css;
  for (const { original, replacement } of replacements) {
    processedCss = processedCss.split(original).join(replacement);
  }

  return processedCss;
}

async function inlineImages(original: HTMLElement, clone: HTMLElement, cache: DomCaptureCache): Promise<void> {
  const promises: Promise<void>[] = [];
  inlineImagesRecursive(original, clone, promises, cache);
  await Promise.all(promises);
}

function inlineImagesRecursive(original: Node, clone: Node, promises: Promise<void>[], cache: DomCaptureCache) {
  // 1. Process Current Node
  if (original instanceof HTMLImageElement && clone instanceof HTMLImageElement) {
    const src = original.currentSrc || original.src;
    if (src && !src.startsWith('data:')) {
      promises.push(
        fetchAsDataUri(src, cache)
          .then((dataUri) => {
            (clone as HTMLImageElement).src = dataUri;
            (clone as HTMLImageElement).removeAttribute('srcset');
            (clone as HTMLImageElement).removeAttribute('sizes');
          })
          .catch((e) => console.warn('Helios: Failed to inline image:', src, e))
      );
    }
  } else if (original instanceof HTMLElement && clone instanceof HTMLElement) {
    // Handle background-images (inline styles only)
    const bg = clone.style.backgroundImage;
    if (bg && bg.includes('url(')) {
      const match = bg.match(/url\(['"]?(.*?)['"]?\)/);
      if (match && match[1] && !match[1].startsWith('data:')) {
        promises.push(
          fetchAsDataUri(match[1], cache)
            .then((dataUri) => {
              // Replace the specific URL instance to preserve other layers (gradients, etc.)
              clone.style.backgroundImage = clone.style.backgroundImage.replace(
                match[0],
                `url("${dataUri}")`
              );
            })
            .catch((e) => console.warn('Helios: Failed to inline background:', match[1], e))
        );
      }
    }
  }

  // 2. Recurse Children
  const originalChildren = Array.from(original.childNodes);
  let cloneChildren = Array.from(clone.childNodes);

  // Check for Shadow DOM / Template
  if (original instanceof Element && original.shadowRoot) {
    const template = cloneChildren.find(
      (n) => n instanceof HTMLTemplateElement && n.hasAttribute('shadowrootmode')
    ) as HTMLTemplateElement | undefined;
    if (template) {
      // Remove template from cloneChildren list to match originalChildren
      cloneChildren = cloneChildren.filter((n) => n !== template);
      // Recurse into shadow
      inlineImagesRecursive(original.shadowRoot, template.content, promises, cache);
    }
  }

  // Check for explicit template elements
  if (original instanceof HTMLTemplateElement && clone instanceof HTMLTemplateElement) {
     // Note: Standard cloneNode(false) on template doesn't clone content, so clone.content might be empty.
     // If cloneWithShadow didn't handle it, we can't do much here unless we manually clone content.
     // But inlineCanvases doesn't handle this either, so preserving parity.
  }

  for (let i = 0; i < Math.min(originalChildren.length, cloneChildren.length); i++) {
    inlineImagesRecursive(originalChildren[i], cloneChildren[i], promises, cache);
  }
}

function fetchAsDataUri(url: string, cache: DomCaptureCache): Promise<string> {
  return cached(cache, 'data:' + url, async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  });
}

const KEYFRAME_META = new Set(['offset', 'computedOffset', 'easing', 'composite']);
const cssPropertyName = (p: string) => (p === 'cssFloat' ? 'float' : p.startsWith('--') ? p : p.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()));

/**
 * Writes each animated property's current computed value inline on the clone, for every
 * animation (CSS or WAAPI) the page's timeline has seeked. FREEZE_ANIMATIONS_CSS then switches
 * animations off inside the SVG image, so the clone shows the frame at the seeked time. The live
 * document is only read. Pseudo-element animations have no element to write to and are skipped.
 */
function freezeAnimations(original: HTMLElement, clone: HTMLElement): void {
  const doc = original.ownerDocument || document;
  const view = doc.defaultView;
  if (!view || typeof (doc as any).getAnimations !== 'function') return;
  const animated = new Map<Element, Set<string>>();
  for (const anim of (doc as any).getAnimations() as Animation[]) {
    const effect = anim.effect as KeyframeEffect | null;
    const target = effect && effect.target;
    if (!target || effect.pseudoElement || typeof effect.getKeyframes !== 'function') continue;
    let props = animated.get(target);
    if (!props) animated.set(target, (props = new Set()));
    for (const keyframe of effect.getKeyframes()) {
      for (const prop of Object.keys(keyframe)) if (!KEYFRAME_META.has(prop)) props.add(cssPropertyName(prop));
    }
  }
  if (animated.size) freezeAnimationsRecursive(original, clone, animated, view);
}

function freezeAnimationsRecursive(original: Node, clone: Node, animated: Map<Element, Set<string>>, view: Window): void {
  const props = animated.get(original as Element);
  const style = (clone as HTMLElement | SVGElement).style;
  if (props && style) {
    const computed = view.getComputedStyle(original as Element);
    for (const prop of props) {
      const value = computed.getPropertyValue(prop);
      if (value) style.setProperty(prop, value);
    }
  }

  const originalChildren = Array.from(original.childNodes);
  let cloneChildren = Array.from(clone.childNodes);
  if (original instanceof Element && original.shadowRoot) {
    const template = cloneChildren.find(
      (n) => n instanceof HTMLTemplateElement && n.hasAttribute('shadowrootmode')
    ) as HTMLTemplateElement | undefined;
    if (template) {
      cloneChildren = cloneChildren.filter((n) => n !== template);
      freezeAnimationsRecursive(original.shadowRoot, template.content, animated, view);
    }
  }
  for (let i = 0; i < Math.min(originalChildren.length, cloneChildren.length); i++) {
    freezeAnimationsRecursive(originalChildren[i], cloneChildren[i], animated, view);
  }
}

function inlineCanvases(original: HTMLElement, clone: HTMLElement): HTMLElement {
  return inlineCanvasesRecursive(original, clone) as HTMLElement;
}

function inlineCanvasesRecursive(original: Node, clone: Node): Node {
  // 1. Check matching nodes
  if (original instanceof HTMLCanvasElement && clone instanceof HTMLCanvasElement) {
    try {
      const dataUri = original.toDataURL();
      const img = document.createElement('img');
      img.src = dataUri;
      img.style.cssText = original.style.cssText;
      img.className = original.className;
      if (original.id) img.id = original.id;
      if (original.hasAttribute('width')) img.setAttribute('width', original.getAttribute('width')!);
      if (original.hasAttribute('height')) img.setAttribute('height', original.getAttribute('height')!);

      if (clone.parentNode) {
        clone.parentNode.replaceChild(img, clone);
      }
      return img; // Stop processing this branch
    } catch (e) {
      console.warn('Helios: Failed to inline canvas:', e);
    }
  }

  // 2. Recurse Children
  const originalChildren = Array.from(original.childNodes);
  let cloneChildren = Array.from(clone.childNodes);

  // Check for Shadow DOM / Template
  if (original instanceof Element && original.shadowRoot) {
    const template = cloneChildren.find(
      (n) => n instanceof HTMLTemplateElement && n.hasAttribute('shadowrootmode')
    ) as HTMLTemplateElement | undefined;
    if (template) {
      // Remove template from cloneChildren list to match originalChildren
      cloneChildren = cloneChildren.filter((n) => n !== template);
      // Recurse into shadow
      inlineCanvasesRecursive(original.shadowRoot, template.content);
    }
  }

  for (let i = 0; i < Math.min(originalChildren.length, cloneChildren.length); i++) {
    inlineCanvasesRecursive(originalChildren[i], cloneChildren[i]);
  }

  return clone;
}

function inlineFormValues(original: HTMLElement, clone: HTMLElement): void {
  inlineFormValuesRecursive(original, clone);
}

function inlineFormValuesRecursive(original: Node, clone: Node): void {
  // 1. Process Current Node
  if (original instanceof HTMLInputElement && clone instanceof HTMLInputElement) {
    clone.setAttribute('value', original.value);
    if (original.type === 'checkbox' || original.type === 'radio') {
      if (original.checked) {
        clone.setAttribute('checked', '');
      } else {
        clone.removeAttribute('checked');
      }
    }
  } else if (original instanceof HTMLTextAreaElement && clone instanceof HTMLTextAreaElement) {
    clone.textContent = original.value;
  } else if (original instanceof HTMLSelectElement && clone instanceof HTMLSelectElement) {
    const options = Array.from(clone.options);
    for (let i = 0; i < options.length; i++) {
      if (i === original.selectedIndex) {
        options[i].setAttribute('selected', '');
      } else {
        options[i].removeAttribute('selected');
      }
    }
  }

  // 2. Recurse Children
  const originalChildren = Array.from(original.childNodes);
  let cloneChildren = Array.from(clone.childNodes);

  // Check for Shadow DOM / Template
  if (original instanceof Element && original.shadowRoot) {
    const template = cloneChildren.find(
      (n) => n instanceof HTMLTemplateElement && n.hasAttribute('shadowrootmode')
    ) as HTMLTemplateElement | undefined;
    if (template) {
      // Remove template from cloneChildren list to match originalChildren
      cloneChildren = cloneChildren.filter((n) => n !== template);
      // Recurse into shadow
      inlineFormValuesRecursive(original.shadowRoot, template.content);
    }
  }

  for (let i = 0; i < Math.min(originalChildren.length, cloneChildren.length); i++) {
    inlineFormValuesRecursive(originalChildren[i], cloneChildren[i]);
  }
}

function inlineVideos(original: HTMLElement, clone: HTMLElement): HTMLElement {
  return inlineVideosRecursive(original, clone) as HTMLElement;
}

function inlineVideosRecursive(original: Node, clone: Node): Node {
  // 1. Check matching nodes
  if (original instanceof HTMLVideoElement && clone instanceof HTMLVideoElement) {
    if (original.readyState >= 2) {
      const img = videoToImage(original);
      if (img) {
        if (clone.parentNode) {
          clone.parentNode.replaceChild(img, clone);
        }
        return img; // Stop processing this branch
      }
    }
  }

  // 2. Recurse Children
  const originalChildren = Array.from(original.childNodes);
  let cloneChildren = Array.from(clone.childNodes);

  // Check for Shadow DOM / Template
  if (original instanceof Element && original.shadowRoot) {
    const template = cloneChildren.find(
      (n) => n instanceof HTMLTemplateElement && n.hasAttribute('shadowrootmode')
    ) as HTMLTemplateElement | undefined;
    if (template) {
      // Remove template from cloneChildren list to match originalChildren
      cloneChildren = cloneChildren.filter((n) => n !== template);
      // Recurse into shadow
      inlineVideosRecursive(original.shadowRoot, template.content);
    }
  }

  for (let i = 0; i < Math.min(originalChildren.length, cloneChildren.length); i++) {
    inlineVideosRecursive(originalChildren[i], cloneChildren[i]);
  }

  return clone;
}

function videoToImage(video: HTMLVideoElement): HTMLImageElement | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 300;
    canvas.height = video.videoHeight || 150;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUri = canvas.toDataURL();

      const img = document.createElement('img');
      img.src = dataUri;
      img.style.cssText = video.style.cssText;
      img.className = video.className;
      if (video.id) img.id = video.id;
      if (video.hasAttribute('width')) img.setAttribute('width', video.getAttribute('width')!);
      if (video.hasAttribute('height')) img.setAttribute('height', video.getAttribute('height')!);

      return img;
    }
  } catch (e) {
    console.warn('Helios: Failed to inline video:', e);
  }
  return null;
}

function cloneWithShadow(node: Node): Node {
  const clone = node.cloneNode(false);

  // 1. Handle Shadow DOM
  if (node instanceof Element && node.shadowRoot) {
    const shadowRoot = node.shadowRoot;
    const template = document.createElement('template');
    template.setAttribute('shadowrootmode', shadowRoot.mode);

    // Serialize adoptedStyleSheets
    if (shadowRoot.adoptedStyleSheets && shadowRoot.adoptedStyleSheets.length > 0) {
      shadowRoot.adoptedStyleSheets.forEach((sheet) => {
        const style = document.createElement('style');
        try {
          const rules = Array.from(sheet.cssRules)
            .map((r) => r.cssText)
            .join('\n');
          style.textContent = rules;
        } catch (e) {
          console.warn('Helios: Failed to read cssRules from adoptedStyleSheet', e);
        }
        template.content.appendChild(style);
      });
    }

    // Clone shadow children into template content
    shadowRoot.childNodes.forEach((child) => {
      template.content.appendChild(cloneWithShadow(child));
    });

    clone.appendChild(template);
  }

  // 2. Handle Light DOM Children
  node.childNodes.forEach((child) => {
    clone.appendChild(cloneWithShadow(child));
  });

  return clone;
}
