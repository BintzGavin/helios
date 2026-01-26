#### 1. Context & Goal
- **Objective**: Enhance `DomStrategy` to preload CSS background images, ensuring they are fully loaded and decoded before rendering starts.
- **Trigger**: The current `DomStrategy.prepare()` only waits for `<img>` tags and fonts. This leaves CSS background images prone to "pop-in" artifacts in the first few frames if they haven't finished decoding, violating the "Asset preloading prevents artifacts" vision.
- **Impact**: Improves render stability and visual quality for DOM-based compositions that utilize CSS background images, preventing flickering.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts` (Implement detection and preloading logic)
- **Modify**: `packages/renderer/scripts/verify-dom-preload.ts` (Update verification script to include a background image test case)

#### 3. Implementation Spec
- **Architecture**: Extend the `prepare` lifecycle method in `DomStrategy` to scan the computed styles of DOM elements, identify `background-image` URLs, and force-load them using the browser's `Image` API.
- **Pseudo-Code**:
  - IN `DomStrategy.prepare(page)`:
    - KEEP existing wait for `document.fonts.ready`.
    - KEEP existing wait for `document.images`.
    - DEFINE helper `preloadBackgrounds()`:
      - QUERY all elements in document (`*`).
      - ITERATE over elements:
        - GET `computedStyle(element).backgroundImage`.
        - IF value is not 'none':
          - PARSE all URLs from the string (handle multiple backgrounds).
          - COLLECT unique URLs.
      - FOR EACH unique URL:
        - CREATE new `Image()`.
        - SET `src` to URL.
        - RETURN Promise resolving on `onload` OR `onerror` (don't block on error).
    - CALL `preloadBackgrounds()` inside the page context.
    - AWAIT `Promise.all` of the background image promises.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx ts-node packages/renderer/scripts/verify-dom-preload.ts`
- **Success Criteria**:
  - Script completes successfully.
  - Logs (which should be added to the script/strategy) confirm that background images were detected and waited for.
  - Output video `output/verify-dom.mp4` is created and valid.
- **Edge Cases**:
  - Elements with `background-image: none`.
  - Multiple background images on a single element (`url(a.jpg), url(b.png)`).
  - Data URIs (should be handled naturally).
  - Broken URLs (should catch error and proceed).
