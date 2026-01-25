export async function captureDomToBitmap(element: HTMLElement): Promise<ImageBitmap> {
  const doc = element.ownerDocument || document;

  // 1. Serialize DOM
  const serializer = new XMLSerializer();
  const html = serializer.serializeToString(element);

  // 2. Collect styles
  // We collect all style tags to ensure CSS-in-JS and other styles are preserved.
  // Note: External stylesheets (<link rel="stylesheet">) might not work due to CORS
  // or because they are not loaded synchronously in the SVG.
  // A robust implementation would fetch and inline them, but for now we focus on inline styles.
  const styles = Array.from(doc.querySelectorAll('style'))
    .map(style => style.outerHTML)
    .join('\n');

  // 3. Determine dimensions
  // Use scroll dimensions to capture full content, fallback to offset or defaults.
  const width = element.scrollWidth || element.offsetWidth || 1920;
  const height = element.scrollHeight || element.offsetHeight || 1080;

  // 4. Construct SVG
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

  // 5. Create Blob and URL
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  // 6. Load Image
  const img = new Image();

  // Return a promise that resolves when the image loads
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => reject(new Error('Failed to load SVG image for DOM capture'));
    img.src = url;
  });

  // 7. Create ImageBitmap
  const bitmap = await createImageBitmap(img);

  // 8. Cleanup
  URL.revokeObjectURL(url);

  return bitmap;
}
