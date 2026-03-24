---
id: PERF-052
slug: eliminate-array-allocation-in-dom-traversal
status: unclaimed
claimed_by: ""
created: 2026-03-24
completed: ""
result: ""
---

# PERF-052: Optimize Preload Script and Element Traversal Iterations

## Focus Area
The DOM parsing and preloading logic in `packages/renderer/src/utils/dom-scripts.ts` and `packages/renderer/src/utils/dom-preload.ts`. Specifically, the recursive and array-allocating nature of `findAllMedia`, `findAllScopes`, and `findAllImages`.

## Background Research
Currently, the renderer caches DOM media elements inside `SeekTimeDriver.ts` (`cachedMediaElements` and `cachedScopes`), reducing overhead per frame. However, the DOM traversal utilities (like `findAllMedia` and `findAllScopes`) use recursive calls and heavy array concatenation (`media.push(...findAllMedia(node.shadowRoot))` or `scopes.push.apply(scopes, findAllScopes(node.shadowRoot))`).
During `DomStrategy` preload or driver evaluation, avoiding these recursive spread allocations can save V8 garbage collection overhead and reduce string evaluation time when injected via CDP.
By converting these tree walkers into iterative, flat loops that reuse a single results array without spreads, we avoid multiple intermediate array allocations.

## Benchmark Configuration
- **Composition URL**: standard DOM benchmark composition (e.g., `http://localhost:3000/default-dom-test`)
- **Render Settings**: 1920x1080, 30 FPS, 5 seconds, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~31.943s
- **Bottleneck analysis**: Micro-optimizations in string sizes and V8 object array concatenation can provide small but compounding improvements during the page initialization and evaluation stages.

## Implementation Spec

### Step 1: Optimize findAllMedia
**File**: `packages/renderer/src/utils/dom-scripts.ts`
**What to change**:
Rewrite `FIND_ALL_MEDIA_FUNCTION` to use a single array and iterative traversal without spread operators.
```javascript
export const FIND_ALL_MEDIA_FUNCTION = `
  function findAllMedia(rootNode, mediaArray) {
    const media = mediaArray || [];
    if (rootNode.nodeType === Node.ELEMENT_NODE && !mediaArray) {
      const tagName = rootNode.tagName;
      if (tagName === 'AUDIO' || tagName === 'VIDEO') {
        media.push(rootNode);
      }
    }
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
        media.push(node);
      }
      if (node.shadowRoot) {
        findAllMedia(node.shadowRoot, media);
      }
    }
    return media;
  }
`;
```
**Why**: This eliminates intermediate array creations and the use of the spread operator `...` which is slow and allocates additional memory per shadow root.
**Risk**: Low. Equivalent logical traversal.

### Step 2: Optimize findAllScopes
**File**: `packages/renderer/src/utils/dom-scripts.ts`
**What to change**:
Rewrite `FIND_ALL_SCOPES_FUNCTION` to use a single array and iterative traversal without `apply`.
```javascript
export const FIND_ALL_SCOPES_FUNCTION = `
  function findAllScopes(rootNode, scopesArray) {
    const scopes = scopesArray || [];
    if (!scopesArray) {
        scopes.push(rootNode);
    }
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.shadowRoot) {
        scopes.push(node.shadowRoot);
        findAllScopes(node.shadowRoot, scopes);
      }
    }
    return scopes;
  }
`;
```

### Step 3: Optimize findAllImages
**File**: `packages/renderer/src/utils/dom-scripts.ts`
**What to change**:
Rewrite `FIND_ALL_IMAGES_FUNCTION` similarly to avoid spread operators:
```javascript
export const FIND_ALL_IMAGES_FUNCTION = `
  function findAllImages(root, imagesArray) {
    const images = imagesArray || [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.tagName === 'IMG') {
        images.push(node);
      }
      // Check for VIDEO poster
      if (node.tagName === 'VIDEO' && node.poster) {
        const img = new Image();
        img.src = node.poster;
        images.push(img);
      }
      // Check for SVG IMAGE
      if (node.tagName === 'image' || node.tagName === 'IMAGE') {
        const href = node.getAttribute('href') || node.getAttribute('xlink:href');
        if (href) {
          const img = new Image();
          img.src = href;
          images.push(img);
        }
      }
      if (node.shadowRoot) {
        findAllImages(node.shadowRoot, images);
      }
    }
    return images;
  }
`;
```
**Why**: Prevents intermediate array allocations in shadow root traversals.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-seek-driver-offsets.ts` and `npx tsx packages/renderer/tests/verify-seek-driver-determinism.ts` after ensuring `.agents/skills/helios` modules exist.

## Correctness Check
Run the DOM traversal and verification tests to make sure everything parses correctly.

## Prior Art
- Array allocations in tight loops or large trees (like shadow DOM traversals) cause garbage collection sweeps.
