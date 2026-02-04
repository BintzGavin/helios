# Context & Goal
- **Objective**: Ensure that images with `srcset` or `<picture>` elements are correctly captured during client-side DOM export by inlining the `currentSrc` as a Data URI and removing responsive attributes, guaranteeing that the exported frame visually matches the user's preview.
- **Trigger**: "Vision Gaps to Hunt For" identified a risk in "Client-Side Export" where standard DOM APIs (`srcset`) are not fully supported, leading to potential visual discrepancies (broken or low-res images) in the export.
- **Impact**: Fixes broken or incorrect images in exports for responsive layouts, ensuring "High Fidelity" export as promised by the vision.

# File Inventory
- **Modify**: `packages/player/src/features/dom-capture.ts`
  - Refactor `inlineImages` to recursively traverse `original` and `clone` nodes in parallel (mirroring `inlineCanvases` pattern).
  - Update logic to prioritize `original.currentSrc` over `src`.
  - Remove `srcset` and `sizes` attributes from cloned images.
- **Modify**: `packages/player/src/features/dom-capture.test.ts`
  - Add unit tests validating `srcset` handling (ensuring `currentSrc` is used).
  - Add unit tests for `<picture>` elements.

# Implementation Spec
- **Architecture**: Update the `inlineImages` function signature to `inlineImages(original: HTMLElement, clone: HTMLElement): Promise<void>`.
- **Pseudo-Code**:
  ```typescript
  async function inlineImages(original: HTMLElement, clone: HTMLElement): Promise<void> {
      // 1. Recursive helper similar to inlineCanvasesRecursive
      // 2. If node is HTMLImageElement:
      //    const src = original.currentSrc || original.src;
      //    const dataUri = await fetchAsDataUri(src);
      //    clone.src = dataUri;
      //    clone.removeAttribute('srcset');
      //    clone.removeAttribute('sizes');
      //    // If parent is <picture>, remove sibling <source> elements in clone
      //    if (clone.parentElement?.tagName === 'PICTURE') {
      //        // Remove <source> children from clone parent
      //    }
      // 3. If node has background-image (inline style):
      //    // Existing logic, but ensuring it runs during recursive walk
      // 4. Recurse children (handling Shadow DOM via template[shadowrootmode])
  }
  ```
- **Public API Changes**: None (internal utility).
- **Dependencies**: None.

# Test Plan
- **Verification**: `npx vitest packages/player/src/features/dom-capture.test.ts`
- **Success Criteria**:
  - New test `should handle srcset by capturing currentSrc` passes.
  - New test `should handle picture elements` passes.
  - Existing tests pass (regression check).
- **Edge Cases**:
  - `currentSrc` is empty (fallback to `src`).
  - `currentSrc` is already a data URI.
  - Image inside Shadow DOM (recursive walk must handle).
  - `<picture>` element with multiple sources (ensure `img` src wins).
