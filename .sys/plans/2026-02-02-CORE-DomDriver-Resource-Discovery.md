# Context & Goal
- **Objective**: Enhance `DomDriver.waitUntilStable()` to automatically detect and preload CSS background images, SVG `<image>` elements, and Video posters.
- **Trigger**: "Vision: Native Always Wins". Current implementation only waits for `<img>` tags, leading to potential flickering of background/SVG assets during rendering because the browser may not have finished loading them when `waitUntilStable` resolves.
- **Impact**: Ensures deterministic rendering for compositions using CSS backgrounds, masks, or SVG assets. Fixes "missing assets" issues in headless rendering.

# File Inventory
- **Modify**: `packages/core/src/drivers/DomDriver.ts`
  - Update `waitUntilStable` to scan for additional resources.
  - Add `scanForResources` method.
- **Modify**: `packages/core/src/drivers/DomDriver.test.ts`
  - Add unit tests for CSS background, mask, SVG image, and video poster discovery.

# Implementation Spec
- **Architecture**:
  - `waitUntilStable` currently waits for `document.fonts.ready`, `img.decode()`, and `media.seeked`.
  - We will extend this to finding URLs in computed styles and SVG attributes.
  - Iterate through all registered scopes (Document + ShadowRoots).
  - Use `querySelectorAll('*')` to find elements.
  - Use `getComputedStyle(el)` to check `backgroundImage`, `maskImage`, `listStyleImage`.
  - Use Regex to extract `url(...)`.
  - Preload discovered URLs using `new Image()`.

- **Performance Considerations**:
  - `getComputedStyle` on all elements is expensive.
  - Optimization: Skip non-visual tags (`SCRIPT`, `STYLE`, `META`, `HEAD`, `LINK`).
  - This cost is acceptable because `waitUntilStable` is primarily used during:
    1. Offline Rendering (once per frame, where correctness > realtime speed).
    2. Seek operations in Preview (user initiated).
  - It is NOT called during realtime playback loop.

- **Pseudo-Code**:
  ```typescript
  async waitUntilStable() {
    // ... existing logic ...
    const resourcePromises = [];
    for (const scope of this.scopes) {
        resourcePromises.push(...this.scanForResources(scope));
    }
    // ... wait for all ...
  }

  private scanForResources(scope): Promise<void>[] {
     const elements = scope.querySelectorAll('*');
     for (const el of elements) {
         if (['SCRIPT', 'STYLE', 'META'].includes(el.tagName)) continue;

         const style = window.getComputedStyle(el);
         // Check backgroundImage, maskImage, etc.
         // Extract URLs with Regex /url\((['"]?)(.*?)\1\)/g
         // this.loadImage(url)
     }
     // Also scan SVG <image href="...">
     // Also scan Video posters (from this.mediaElements)
  }
  ```

# Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `DomDriver.test.ts` passes new tests.
  - Tests should verify:
    - `background-image` is loaded.
    - `mask-image` is loaded.
    - SVG `<image>` is loaded.
    - `<video poster>` is loaded.
    - Invalid URLs do not cause unhandled rejections.
- **Edge Cases**:
  - Multiple background images (`url(a), url(b)`).
  - Data URIs (should be skipped or handled).
  - Shadow DOM isolation.
