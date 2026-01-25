# Plan: Improve Client-Side DOM Export with SVG Serialization

## 1. Context & Goal
- **Objective**: Upgrade the Client-Side DOM Exporter to use SVG `<foreignObject>` serialization instead of manual rectangle painting.
- **Trigger**: The current DOM export implementation only renders colored boxes (backgrounds/borders) and ignores text, images, and complex styles, resulting in unusable exports for DOM-based compositions.
- **Impact**: Enables high-fidelity client-side export for HTML/CSS compositions (in Direct/Same-Origin Mode), supporting text, shadows, transforms, and opacity.

## 2. File Inventory
- **Modify**: `packages/player/src/features/exporter.ts` (Replace `renderElementToCanvas` with SVG logic)
- **Read-Only**: `packages/player/src/controllers.ts`

## 3. Implementation Spec
- **Architecture**:
  - Replace the DOM tree walker (`renderElementToCanvas`) with `XMLSerializer`.
  - Wrap the serialized DOM in SVG `<foreignObject>`.
  - Use `Blob` + `URL.createObjectURL` to load the SVG into an `Image`.
  - Draw the image to the canvas.
- **Pseudo-Code**:
  ```typescript
  private async captureDOMToCanvas(canvas, ctx) {
    const doc = this.iframe.contentDocument;

    // 1. Serialize Body
    const bodyXml = new XMLSerializer().serializeToString(doc.body);

    // 2. Collect Styles
    // We scan for <style> tags. For <link rel="stylesheet">, we can't easily inline without fetching,
    // so we'll start by grabbing local styles.
    let css = "";
    Array.from(doc.querySelectorAll('style')).forEach(s => css += s.outerHTML);

    // 3. Construct SVG
    // Ensure we have a valid XML namespace and size
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">
            ${css}
            ${bodyXml}
          </div>
        </foreignObject>
      </svg>
    `;

    // 4. Create Blob URL
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    // 5. Load & Draw
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw white background by default (transparency in video often issues)
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
  }
  ```
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm run build -w packages/player`
- **Success Criteria**:
  - Build passes.
  - No type errors.
- **Edge Cases**:
  - `doc.body` is null (guarded by `canAccessIframeDOM`).
  - Image loading failure (should propagate error).
