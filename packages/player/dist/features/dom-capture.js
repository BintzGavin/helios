export async function captureDomToBitmap(element) {
    const doc = element.ownerDocument || document;
    // 1. Clone & Inline Assets
    let clone = element.cloneNode(true);
    await inlineImages(clone);
    clone = inlineCanvases(element, clone);
    clone = inlineVideos(element, clone);
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
        const styleClone = style.cloneNode(true);
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
            const processed = await processCss(css, link.href);
            return `<style>/* ${link.href} */\n${processed}</style>`;
        }
        catch (e) {
            console.warn('Helios: Failed to inline stylesheet:', link.href, e);
            return '';
        }
    });
    return (await Promise.all(promises)).join('\n');
}
async function processCss(css, baseUrl) {
    const urlRegex = /url\((?:['"]?)(.*?)(?:['"]?)\)/g;
    const matches = Array.from(css.matchAll(urlRegex));
    const replacementsPromises = matches.map(async (match) => {
        const originalMatch = match[0];
        const url = match[1];
        if (url.startsWith('data:'))
            return null;
        try {
            const absoluteUrl = new URL(url, baseUrl).href;
            const dataUri = await fetchAsDataUri(absoluteUrl);
            return {
                original: originalMatch,
                replacement: `url("${dataUri}")`,
            };
        }
        catch (e) {
            console.warn(`Helios: Failed to inline CSS asset: ${url}`, e);
            return null;
        }
    });
    const replacements = (await Promise.all(replacementsPromises)).filter((r) => r !== null);
    let processedCss = css;
    for (const { original, replacement } of replacements) {
        processedCss = processedCss.split(original).join(replacement);
    }
    return processedCss;
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
                    // Replace the specific URL instance to preserve other layers (gradients, etc.)
                    element.style.backgroundImage = element.style.backgroundImage.replace(match[0], `url("${dataUri}")`);
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
function inlineCanvases(original, clone) {
    // Handle root element being a canvas
    if (original instanceof HTMLCanvasElement && clone instanceof HTMLCanvasElement) {
        try {
            const dataUri = original.toDataURL();
            const img = document.createElement('img');
            img.src = dataUri;
            img.style.cssText = original.style.cssText;
            img.className = original.className;
            if (original.id)
                img.id = original.id;
            if (original.hasAttribute('width'))
                img.setAttribute('width', original.getAttribute('width'));
            if (original.hasAttribute('height'))
                img.setAttribute('height', original.getAttribute('height'));
            return img;
        }
        catch (e) {
            console.warn('Helios: Failed to inline root canvas:', e);
            return clone;
        }
    }
    const originalCanvases = Array.from(original.querySelectorAll('canvas'));
    const clonedCanvases = Array.from(clone.querySelectorAll('canvas'));
    for (let i = 0; i < Math.min(originalCanvases.length, clonedCanvases.length); i++) {
        const source = originalCanvases[i];
        const target = clonedCanvases[i];
        try {
            const dataUri = source.toDataURL();
            const img = document.createElement('img');
            img.src = dataUri;
            img.style.cssText = source.style.cssText;
            img.className = source.className;
            if (source.id)
                img.id = source.id;
            if (source.hasAttribute('width'))
                img.setAttribute('width', source.getAttribute('width'));
            if (source.hasAttribute('height'))
                img.setAttribute('height', source.getAttribute('height'));
            target.parentNode?.replaceChild(img, target);
        }
        catch (e) {
            console.warn('Helios: Failed to inline nested canvas:', e);
        }
    }
    return clone;
}
function inlineVideos(original, clone) {
    // Handle root element being a video
    if (original instanceof HTMLVideoElement && clone instanceof HTMLVideoElement) {
        if (original.readyState >= 2) {
            const img = videoToImage(original);
            if (img)
                return img;
        }
        return clone;
    }
    const originals = Array.from(original.querySelectorAll('video'));
    const clones = Array.from(clone.querySelectorAll('video'));
    for (let i = 0; i < Math.min(originals.length, clones.length); i++) {
        const video = originals[i];
        const target = clones[i];
        if (video.readyState < 2)
            continue; // Skip if no data
        const img = videoToImage(video);
        if (img) {
            target.parentNode?.replaceChild(img, target);
        }
    }
    return clone;
}
function videoToImage(video) {
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
            if (video.id)
                img.id = video.id;
            if (video.hasAttribute('width'))
                img.setAttribute('width', video.getAttribute('width'));
            if (video.hasAttribute('height'))
                img.setAttribute('height', video.getAttribute('height'));
            return img;
        }
    }
    catch (e) {
        console.warn('Helios: Failed to inline video:', e);
    }
    return null;
}
