# 2026-01-23-PLAYER-Robust-DOM-Export

#### 1. Context & Goal
- **Objective**: Implement robust Client-Side DOM Export using `XMLSerializer` and `foreignObject` to support text, CSS, and basic structure.
- **Trigger**: The current DOM export (`ClientSideExporter`) is a placeholder that only draws colored rectangles, ignoring text and complex styles.
- **Impact**: Unlocks actual "Client-Side Export" capabilities for DOM-based compositions (e.g. React/Vue/Svelte), moving beyond the Canvas-only MVP.

#### 2. File Inventory
- **Create**:
  - `packages/player/src/features/dom-capture.ts`: Utility for serializing DOM to `ImageBitmap`.
- **Modify**:
  - `packages/player/src/bridge.ts`: Add `mode: 'dom'` support to `handleCaptureFrame`.
  - `packages/player/src/controllers.ts`: Update `DirectController` and `BridgeController` to handle `mode: 'dom'`.
  - `packages/player/src/features/exporter.ts`: Remove manual rendering logic; delegate to `controller.captureFrame(..., { mode: 'dom' })`.
- **Read-Only**:
  - `packages/player/src/index.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Use `XMLSerializer` to convert the DOM tree to an XHTML string.
  - Wrap the string in an SVG `<foreignObject>`.
  - Use `createImageBitmap(new Blob([svg], { type: 'image/svg+xml' }))` to generate a frame.
  - **Constraint**: External resources (images, fonts, stylesheets) may be blocked by CORS or not loaded synchronously. The implementation should prioritize *inline styles* (collecting `<style>` tags) and accept that external resources might be missing in this iteration. Future iterations can add resource inlining.

- **Pseudo-Code**:
  ```typescript
  // dom-capture.ts
  export async function captureDomToBitmap(element: HTMLElement): Promise<ImageBitmap> {
    const doc = element.ownerDocument || document;
    const html = new XMLSerializer().serializeToString(element);
    const styles = Array.from(doc.querySelectorAll('style')).map(s => s.outerHTML).join('');

    // Ensure size is explicit
    const width = element.offsetWidth || 1920;
    const height = element.offsetHeight || 1080;

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">
            ${styles}
            ${html}
          </div>
        </foreignObject>
      </svg>
    `;

    const blob = new Blob([svg], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(blob);

    // Load into Image then Bitmap
    const img = new Image();
    img.src = url;
    await img.decode(); // Wait for decode
    const bitmap = await createImageBitmap(img);
    URL.revokeObjectURL(url);
    return bitmap;
  }
  ```

- **Public API Changes**:
  - `HeliosController.captureFrame` signature remains compatible but officially supports `mode: 'dom'`.
  - `HELIOS_CAPTURE_FRAME` bridge message supports `mode: 'dom'`.

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm run build -w packages/player`.
  - Serve example: `npm run dev:svelte` (or similar DOM example).
  - Open Player in Bridge Mode.
  - Click "Export".
- **Success Criteria**:
  - The downloaded MP4 should show the HTML text and styles, not just colored boxes.
- **Edge Cases**:
  - DOM with external stylesheets (might lose styles, acceptable for MVP).
  - Canvas inside DOM (might be empty if not handled, acceptable for MVP).
