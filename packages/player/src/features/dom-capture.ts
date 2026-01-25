export async function captureDomToBitmap(element: HTMLElement): Promise<ImageBitmap> {
  const doc = element.ownerDocument || document;

  // 1. Clone & Inline Assets
  const clone = element.cloneNode(true) as HTMLElement;
  await inlineImages(clone);

  // 2. Serialize DOM
  const serializer = new XMLSerializer();
  const html = serializer.serializeToString(clone);

  // 3. Collect styles
  // We collect all style tags to ensure CSS-in-JS and other styles are preserved.
  const styleElements = Array.from(doc.querySelectorAll('style'));
  const inlineStylesPromises = styleElements.map(async (style) => {
    const css = style.textContent || '';
    const processed = await processCss(css, doc.baseURI);
    // Create a new style tag to preserve the structure,
    // but here we just wrap in <style> as we are concatenating strings anyway.
    // If we want to preserve attributes (like id="my-style"), we should look at attributes.
    // The previous implementation used style.outerHTML which preserved attributes.
    // Let's try to preserve attributes by cloning.
    const styleClone = style.cloneNode(true) as HTMLStyleElement;
    styleClone.textContent = processed;
    return styleClone.outerHTML;
  });

  const inlineStyles = (await Promise.all(inlineStylesPromises)).join('\n');

  // Fetch and inline external stylesheets
  const externalStyles = await getExternalStyles(doc);
  const styles = externalStyles + '\n' + inlineStyles;

  // 4. Determine dimensions
  // Use scroll dimensions to capture full content, fallback to offset or defaults.
  const width = element.scrollWidth || element.offsetWidth || 1920;
  const height = element.scrollHeight || element.offsetHeight || 1080;

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

  // 6. Create Blob and URL
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  // 7. Load Image
  const img = new Image();

  // Return a promise that resolves when the image loads
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => reject(new Error('Failed to load SVG image for DOM capture'));
    img.src = url;
  });

  // 8. Create ImageBitmap
  const bitmap = await createImageBitmap(img);

  // 9. Cleanup
  URL.revokeObjectURL(url);

  return bitmap;
}

async function getExternalStyles(doc: Document): Promise<string> {
  const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
  const promises = links.map(async (link) => {
    try {
      // Skip if no href
      if (!link.href) return '';

      const response = await fetch(link.href);
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      const css = await response.text();
      const processed = await processCss(css, link.href);
      return `<style>/* ${link.href} */\n${processed}</style>`;
    } catch (e) {
      console.warn('Helios: Failed to inline stylesheet:', link.href, e);
      return '';
    }
  });
  return (await Promise.all(promises)).join('\n');
}

async function processCss(css: string, baseUrl: string): Promise<string> {
  const urlRegex = /url\((?:['"]?)(.*?)(?:['"]?)\)/g;
  const matches = Array.from(css.matchAll(urlRegex));

  const replacementsPromises = matches.map(async (match) => {
    const originalMatch = match[0];
    const url = match[1];

    if (url.startsWith('data:')) return null;

    try {
      const absoluteUrl = new URL(url, baseUrl).href;
      const dataUri = await fetchAsDataUri(absoluteUrl);
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

async function inlineImages(root: HTMLElement): Promise<void> {
  const promises: Promise<void>[] = [];

  // A. Handle <img> tags
  const images = root.querySelectorAll('img');
  images.forEach((img) => {
    if (img.src && !img.src.startsWith('data:')) {
      promises.push(
        fetchAsDataUri(img.src)
          .then((dataUri) => {
            img.src = dataUri;
          })
          .catch((e) => console.warn('Helios: Failed to inline image:', img.src, e))
      );
    }
  });

  // B. Handle background-images (inline styles only)
  const elementsWithStyle = root.querySelectorAll('[style*="background-image"]');
  elementsWithStyle.forEach((el) => {
    const element = el as HTMLElement;
    const bg = element.style.backgroundImage;
    if (bg && bg.includes('url(')) {
      const match = bg.match(/url\(['"]?(.*?)['"]?\)/);
      if (match && match[1] && !match[1].startsWith('data:')) {
        promises.push(
          fetchAsDataUri(match[1])
            .then((dataUri) => {
              // Replace the specific URL instance to preserve other layers (gradients, etc.)
              element.style.backgroundImage = element.style.backgroundImage.replace(
                match[0],
                `url("${dataUri}")`
              );
            })
            .catch((e) => console.warn('Helios: Failed to inline background:', match[1], e))
        );
      }
    }
  });

  await Promise.all(promises);
}

async function fetchAsDataUri(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
