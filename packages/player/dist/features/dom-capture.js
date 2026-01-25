export async function captureDomToBitmap(element) {
    const doc = element.ownerDocument || document;
    // 1. Clone & Inline Assets
    const clone = element.cloneNode(true);
    await inlineImages(clone);
    // 2. Serialize DOM
    const serializer = new XMLSerializer();
    const html = serializer.serializeToString(clone);
    // 3. Collect styles
    // We collect all style tags to ensure CSS-in-JS and other styles are preserved.
    const inlineStyles = Array.from(doc.querySelectorAll('style'))
        .map(style => style.outerHTML)
        .join('\n');
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
    await new Promise((resolve, reject) => {
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
async function getExternalStyles(doc) {
    const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
    const promises = links.map(async (link) => {
        try {
            // Skip if no href
            if (!link.href)
                return '';
            const response = await fetch(link.href);
            if (!response.ok)
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            const css = await response.text();
            return `<style>/* ${link.href} */\n${css}</style>`;
        }
        catch (e) {
            console.warn('Helios: Failed to inline stylesheet:', link.href, e);
            return '';
        }
    });
    return (await Promise.all(promises)).join('\n');
}
async function inlineImages(root) {
    const promises = [];
    // A. Handle <img> tags
    const images = root.querySelectorAll('img');
    images.forEach((img) => {
        if (img.src && !img.src.startsWith('data:')) {
            promises.push(fetchAsDataUri(img.src)
                .then((dataUri) => {
                img.src = dataUri;
            })
                .catch((e) => console.warn('Helios: Failed to inline image:', img.src, e)));
        }
    });
    // B. Handle background-images (inline styles only)
    const elementsWithStyle = root.querySelectorAll('[style*="background-image"]');
    elementsWithStyle.forEach((el) => {
        const element = el;
        const bg = element.style.backgroundImage;
        if (bg && bg.includes('url(')) {
            const match = bg.match(/url\(['"]?(.*?)['"]?\)/);
            if (match && match[1] && !match[1].startsWith('data:')) {
                promises.push(fetchAsDataUri(match[1])
                    .then((dataUri) => {
                    element.style.backgroundImage = `url("${dataUri}")`;
                })
                    .catch((e) => console.warn('Helios: Failed to inline background:', match[1], e)));
            }
        }
    });
    await Promise.all(promises);
}
async function fetchAsDataUri(url) {
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
