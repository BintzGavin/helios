#### 1. Context & Goal
- **Objective**: Enhance `DomStrategy` to preload `<video>` poster images, SVG `<image>` elements, and CSS `mask-image` assets.
- **Trigger**: Vision gap identified where `DomStrategy` misses these asset types, potentially causing artifacts or missing content in the first rendered frame.
- **Impact**: Ensures "Zero-artifact rendering" for compositions using video posters, SVGs, or CSS masks.

#### 2. File Inventory
- **Create**: `packages/renderer/tests/verify-enhanced-dom-preload.ts` (Verification test)
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts` (Implementation)
- **Read-Only**: `packages/renderer/src/types.ts`

#### 3. Implementation Spec
- **Architecture**: Extend the existing `prepare` script in `DomStrategy` to include additional DOM traversal logic and style computation.
- **Pseudo-Code**:
  - IN `DomStrategy.prepare`:
    - EXTEND `findAllImages` or create new walker:
      - IF `node.tagName` is 'VIDEO' AND has `poster`: COLLECT `poster`.
      - IF `node.tagName` is 'image' (SVG) AND has `href` OR `xlink:href`: COLLECT attributes.
    - EXTEND style scanning loop:
      - GET computed style.
      - CHECK `maskImage` AND `webkitMaskImage`.
      - EXTRACT urls using regex.
      - ADD to `backgroundUrls` set (rename to `resourceUrls` or similar).
    - PRELOAD all collected URLs using `new Image()`.

- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx ts-node packages/renderer/tests/verify-enhanced-dom-preload.ts`
- **Success Criteria**:
  - The test page requests `poster.png`.
  - The test page requests `svg-image.png`.
  - The test page requests `mask.png`.
  - Console logs confirm "[DomStrategy] Preloading X images..." covers these assets.
- **Edge Cases**:
  - Video without poster (should be ignored).
  - SVG image without href (should be ignored).
  - Mask image 'none' (should be ignored).
  - Nested Shadow DOMs (already handled by recursive walker, ensure new logic uses it).
