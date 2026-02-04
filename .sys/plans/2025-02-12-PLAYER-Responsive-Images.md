# 2025-02-12-PLAYER-Responsive-Images

#### 1. Context & Goal
- **Objective**: Fix responsive image capture in client-side exports by using `currentSrc` from the original DOM.
- **Trigger**: Vision gap (Client-Side Export fidelity). Responsive images (`srcset`) are not correctly captured because the DOM clone loses the `currentSrc` selection context of the original environment.
- **Impact**: Ensures accurate visual reproduction of responsive images in exports, preventing low-resolution fallbacks or incorrect image selection.

#### 2. File Inventory
- **Modify**: `packages/player/src/features/dom-capture.ts` (Implement parallel traversal and `currentSrc` logic)
- **Modify**: `packages/player/src/features/dom-capture.test.ts` (Add test case for responsive images)

#### 3. Implementation Spec
- **Architecture**:
    - Replace the isolated `inlineImages(clone)` function with a parallel traversal function `inlineImages(original, clone)` that walks both trees simultaneously.
    - This allows access to the `currentSrc` property of the original `HTMLImageElement`, which represents the browser's resolved image source based on viewport and DPR.
- **Algorithm**:
    1.  Update `captureDomToBitmap` to call `await inlineImages(element, clone)`.
    2.  Implement `inlineImages(original, clone)`:
        -   It should return a `Promise<void>` that resolves when all asset fetches are complete.
        -   It will traverse `original` and `clone` in lockstep (similar to `inlineCanvasesRecursive`).
    3.  **Matching Logic**:
        -   **If node is `HTMLImageElement`**:
            -   Read `original.currentSrc`.
            -   If `currentSrc` is valid, fetch it as a Blob/DataURI.
            -   Set `clone.src` to the fetched DataURI.
            -   **Critical**: Remove `srcset` and `sizes` attributes from `clone`. This forces the browser (and the SVG foreignObject renderer) to use the explicit `src` we just set, ignoring any responsive logic that might misbehave in the detached clone.
        -   **If node is `HTMLElement` (Background Images)**:
            -   Inspect `original.style.backgroundImage`.
            -   If it contains `url(...)` references, fetch them (using existing `fetchAsDataUri` logic) and update `clone.style.backgroundImage`.
            -   *Note*: Computed styles are handled separately in `captureDomToBitmap` via `processCss`, so we only focus on inline styles here to match existing behavior.
        -   **Recursion**:
            -   Recurse into `childNodes`.
            -   Recurse into `shadowRoot` (if present and open) by finding the corresponding `<template shadowrootmode>` in the clone.

#### 4. Test Plan
- **Verification**: Run the updated test suite.
    - Command: `npm test packages/player/src/features/dom-capture.test.ts`
- **Success Criteria**:
    - New test case "should use currentSrc for responsive images" passes.
    - Existing tests (external styles, background images, canvas inlining) continue to pass.
- **New Test Case Logic**:
    - Create an `img` element with `srcset` and `sizes`.
    - Mock `currentSrc` on the original element (since jsdom won't calculate it).
    - Run `captureDomToBitmap`.
    - Verify that the resulting blob/SVG contains the `currentSrc` value as a Data URI.
    - Verify that `srcset` and `sizes` attributes are absent or ineffective in the final markup.
