# 2026-03-02-PLAYER-Video-Inlining.md

## 1. Context & Goal
- **Objective**: Support `<video>` elements in Client-Side DOM Export by inlining them as images.
- **Trigger**: Vision gap - Client-side export (DOM mode) uses `foreignObject` which disables native media playback. `<video>` elements render as empty space, breaking parity with the preview.
- **Impact**: Users can export compositions containing video elements directly from the browser with visual fidelity (current frame captured).

## 2. File Inventory
- **Modify**: `packages/player/src/features/dom-capture.ts` (Implement `inlineVideos`)
- **Modify**: `packages/player/src/features/dom-capture.test.ts` (Add tests for video replacement)

## 3. Implementation Spec
- **Architecture**: Extend the DOM capture pipeline to intercept `<video>` elements, draw their current frame to an offscreen canvas, and replace the video tag in the cloned DOM with a data-URI `<img>`.
- **Public API Changes**: None (internal utility update).
- **Pseudo-Code**:
  ```typescript
  function inlineVideos(original: HTMLElement, clone: HTMLElement): HTMLElement {
    // 1. Handle root element being a video
    if (original instanceof HTMLVideoElement && clone instanceof HTMLVideoElement) {
       if (original.readyState >= 2) { // HAVE_CURRENT_DATA
         // Create canvas
         // ctx.drawImage(original, 0, 0, width, height)
         // img.src = canvas.toDataURL()
         // Copy styles/id/classes/dims
         // Return img
       }
       return clone;
    }

    // 2. Handle nested videos
    const originals = Array.from(original.querySelectorAll('video'));
    const clones = Array.from(clone.querySelectorAll('video'));

    // 3. Iterate and match by index
    for (let i = 0; i < Math.min(originals.length, clones.length); i++) {
       const video = originals[i];
       const target = clones[i];

       if (video.readyState < 2) continue; // Skip if no data

       try {
           const canvas = document.createElement('canvas');
           canvas.width = video.videoWidth || 300;
           canvas.height = video.videoHeight || 150;
           const ctx = canvas.getContext('2d');
           if (ctx) {
               ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
               const dataUri = canvas.toDataURL();

               const img = document.createElement('img');
               img.src = dataUri;
               img.style.cssText = video.style.cssText;
               img.className = video.className;
               if (video.id) img.id = video.id;
               if (video.hasAttribute('width')) img.setAttribute('width', video.getAttribute('width')!);
               if (video.hasAttribute('height')) img.setAttribute('height', video.getAttribute('height')!);

               target.parentNode?.replaceChild(img, target);
           }
       } catch (e) {
           console.warn('Helios: Failed to inline video:', e);
           // Continue to next video
       }
    }
    return clone;
  }
  ```
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npm test -w packages/player`.
- **Success Criteria**:
  - New test case in `dom-capture.test.ts` passes.
  - Test mocks `HTMLCanvasElement.prototype.getContext` and `toDataURL` to verify `drawImage` is called with the video element and the replacement occurs.
- **Edge Cases**:
  - Video not loaded (readyState < 2) -> Skip replacement.
  - CORS tainted video -> `toDataURL` throws. Catch error and warn.
