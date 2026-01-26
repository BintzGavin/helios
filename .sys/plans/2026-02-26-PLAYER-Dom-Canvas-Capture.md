# 2026-02-26-PLAYER-Dom-Canvas-Capture

#### 1. Context & Goal
- **Objective**: Update `captureDomToBitmap` to correctly capture and inline `<canvas>` elements as images during DOM export.
- **Trigger**: Currently, `captureDomToBitmap` clones the DOM using `cloneNode(true)`, which creates empty `<canvas>` elements (missing their content). This results in blank areas in exported videos when using "DOM" mode with WebGL/Canvas content.
- **Impact**: Enables robust "In-Browser Preview" to "Client-Side Export" parity for mixed compositions (e.g., WebGL background + HTML overlay), ensuring the entire visual scene is preserved.

#### 2. File Inventory
- **Create**: None.
- **Modify**:
  - `packages/player/src/features/dom-capture.ts`: Add `inlineCanvases` function to replace cloned canvases with data-URI images.
  - `packages/player/src/features/dom-capture.test.ts`: Add test case for canvas capture.
- **Read-Only**:
  - `packages/player/src/features/exporter.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Within `captureDomToBitmap`, after cloning the root element and before serialization:
  - Iterate through all `<canvas>` elements in the *source* root.
  - For each canvas, generate a data URI snapshot using `toDataURL()`.
  - Find the corresponding canvas in the *cloned* root (using index or matching structure).
  - Replace the cloned `<canvas>` with an `<img>` element containing the data URI and copying relevant attributes (style, class, width, height).
- **Pseudo-Code**:
  ```typescript
  async function inlineCanvases(original: HTMLElement, clone: HTMLElement) {
    const originalCanvases = Array.from(original.querySelectorAll('canvas'));
    const clonedCanvases = Array.from(clone.querySelectorAll('canvas'));

    if (originalCanvases.length !== clonedCanvases.length) {
       console.warn("Canvas count mismatch during capture");
       return;
    }

    for (let i = 0; i < originalCanvases.length; i++) {
       const source = originalCanvases[i];
       const target = clonedCanvases[i];

       try {
         const dataUri = source.toDataURL();
         const img = document.createElement('img');
         img.src = dataUri;
         // Copy layout attributes
         img.style.cssText = source.style.cssText;
         img.className = source.className;
         img.width = source.width;
         img.height = source.height;

         target.parentNode?.replaceChild(img, target);
       } catch (e) {
         console.warn("Failed to inline canvas:", e);
       }
    }
  }
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm test -w packages/player`.
- **Success Criteria**:
  - New test case in `dom-capture.test.ts` passes:
    - Create a canvas, draw a rect (e.g., red).
    - Capture it via `captureDomToBitmap`.
    - Verify the resulting SVG/Blob contains the data URI (or at least an `<img>` tag).
- **Edge Cases**:
  - Tainted canvases (CORS) will throw on `toDataURL()`. We should catch this and warn, leaving the empty canvas or a placeholder.
  - `OffscreenCanvas` (not in DOM query) is out of scope.
