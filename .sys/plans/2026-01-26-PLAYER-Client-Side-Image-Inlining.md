# PLAYER: Client-Side Image Inlining

#### 1. Context & Goal
- **Objective**: Implement automatic inlining of external images (`<img>` and `background-image`) as Data URIs during client-side DOM export.
- **Trigger**: "Client-Side Export" fidelity gap; currently, external images are blocked by SVG security restrictions in `foreignObject`, resulting in missing assets in exported videos.
- **Impact**: Enables high-fidelity "WYSIWYG" client-side exports for compositions using standard web images, fulfilling the "Native Always Wins" thesis.

#### 2. File Inventory
- **Modify**: `packages/player/src/features/dom-capture.ts` (Implement `inlineImages` and update `captureDomToBitmap`)
- **Modify**: `packages/player/src/features/dom-capture.test.ts` (Add unit tests for image inlining)

#### 3. Implementation Spec
- **Architecture**:
  - The `captureDomToBitmap` function currently serializes the live DOM element. To modify content (inline images) without side effects, we must first clone the element.
  - A new utility `inlineImages(element: HTMLElement)` will recursively traverse the cloned tree.
  - It will identify `HTMLImageElement` nodes and elements with `style.backgroundImage`.
  - For each external resource, it will perform a `fetch()`, convert the response to a Base64 Data URI, and replace the original URL.
  - This ensures that the SVG `foreignObject` (which runs in a secure, isolated context) has access to the image data.

- **Pseudo-Code**:
  ```typescript
  // packages/player/src/features/dom-capture.ts

  export async function captureDomToBitmap(element: HTMLElement): Promise<ImageBitmap> {
    // 1. Clone to avoid mutating live DOM
    const clone = element.cloneNode(true) as HTMLElement;

    // 2. Inline assets (Images)
    await inlineImages(clone);

    // 3. Serialize (use clone instead of element)
    const serializer = new XMLSerializer();
    const html = serializer.serializeToString(clone);

    // ... existing style inlining ...
    // ... existing SVG creation ...
  }

  async function inlineImages(root: HTMLElement): Promise<void> {
    const promises: Promise<void>[] = [];

    // A. Handle <img> tags
    const images = root.querySelectorAll('img');
    images.forEach(img => {
      if (img.src && !img.src.startsWith('data:')) {
        promises.push(
          fetchAsDataUri(img.src)
            .then(dataUri => { img.src = dataUri; })
            .catch(e => console.warn('Failed to inline image:', img.src, e))
        );
      }
    });

    // B. Handle background-images (inline styles only for now)
    // Note: Parsing computed styles or stylesheets is out of scope for this iteration.
    const elementsWithStyle = root.querySelectorAll('[style*="background-image"]');
    elementsWithStyle.forEach(el => {
      const style = (el as HTMLElement).style;
      const bg = style.backgroundImage; // e.g., 'url("...")'
      if (bg && bg.includes('url(')) {
        // Extract URL using regex
        const match = bg.match(/url\(['"]?(.*?)['"]?\)/);
        if (match && match[1] && !match[1].startsWith('data:')) {
           promises.push(
             fetchAsDataUri(match[1])
               .then(dataUri => { style.backgroundImage = `url("${dataUri}")`; })
               .catch(e => console.warn('Failed to inline background:', match[1], e))
           );
        }
      }
    });

    await Promise.all(promises);
  }

  async function fetchAsDataUri(url: string): Promise<string> {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  ```

- **Public API Changes**: None (Internal utility update).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - `dom-capture.test.ts` passes.
  - New test case: `should inline external images` verifies that an `<img>` with an external URL is converted to a `data:` URI in the captured SVG.
  - New test case: `should inline background images` verifies `style="background-image: url(...)"` is converted.
- **Edge Cases**:
  - `fetch` fails (404/CORS): Should keep original URL (or log warning) and not crash.
  - Image is already Data URI: Should remain unchanged.
  - Image has no `src`: Should be ignored.
