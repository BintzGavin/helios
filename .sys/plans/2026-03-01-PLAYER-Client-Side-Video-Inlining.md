# Plan: Client-Side Video Inlining for DOM Export

## 1. Context & Goal
- **Objective**: Enable client-side export of `<video>` elements by replacing them with static image captures in `captureDomToBitmap`.
- **Trigger**: Vision gap in "Robust DOM Export"; currently, `<video>` elements render as blank/invisible in client-side exports (WebCodecs/DOM mode) because `foreignObject` cannot render them directly.
- **Impact**: Unlocks full export capability for projects using video elements, such as `examples/media-element-animation`.

## 2. File Inventory
- **Modify**:
    - `packages/player/src/features/dom-capture.ts`: Implement `inlineVideos` function and call it within `captureDomToBitmap`.
    - `packages/player/src/features/dom-capture.test.ts`: Add test case for `<video>` element replacement.

## 3. Implementation Spec
- **Architecture**:
    - Introduce a synchronous `inlineVideos(original: HTMLElement, clone: HTMLElement): HTMLElement` function similar to `inlineCanvases`.
    - Since `HTMLVideoElement` is a media source, we can draw it to a canvas to capture the current frame.
    - **Note**: This assumes the video is currently paused at the correct frame (which is true during the `ClientSideExporter` seek-and-capture loop).
- **Pseudo-Code**:
    ```typescript
    // packages/player/src/features/dom-capture.ts

    export async function captureDomToBitmap(element: HTMLElement): Promise<ImageBitmap> {
      // ... existing logic ...
      let clone = element.cloneNode(true) as HTMLElement;
      await inlineImages(clone);
      clone = inlineCanvases(element, clone);
      clone = inlineVideos(element, clone); // <-- Add this
      // ...
    }

    function inlineVideos(original: HTMLElement, clone: HTMLElement): HTMLElement {
      // Handle root element if it is a video
      if (original instanceof HTMLVideoElement && clone instanceof HTMLVideoElement) {
         return videoToImage(original, clone);
      }

      const originalVideos = Array.from(original.querySelectorAll('video'));
      const clonedVideos = Array.from(clone.querySelectorAll('video'));

      for (let i = 0; i < Math.min(originalVideos.length, clonedVideos.length); i++) {
         const source = originalVideos[i];
         const target = clonedVideos[i];
         const img = videoToImage(source, target);
         if (target.parentNode) {
             target.parentNode.replaceChild(img, target);
         }
      }
      return clone;
    }

    function videoToImage(source: HTMLVideoElement, target: HTMLElement): HTMLImageElement {
         // Create canvas with video dimensions
         const canvas = document.createElement('canvas');
         const width = source.videoWidth || source.clientWidth;
         const height = source.videoHeight || source.clientHeight;
         canvas.width = width;
         canvas.height = height;

         // Draw source video to canvas
         const ctx = canvas.getContext('2d');
         if (ctx) {
             try {
                ctx.drawImage(source, 0, 0, width, height);
             } catch (e) {
                console.warn('Helios: Failed to draw video frame to canvas', e);
             }
         }

         // Get Data URI
         const dataUri = canvas.toDataURL(); // defaults to image/png

         // Create img element
         const img = document.createElement('img');
         img.src = dataUri;

         // Copy styles/classes/id/attributes from target (which is a clone of source)
         img.className = target.className;
         img.style.cssText = target.style.cssText;
         if (target.id) img.id = target.id;

         // Ensure dimensions are preserved if explicitly set
         if (target.getAttribute('width')) img.setAttribute('width', target.getAttribute('width')!);
         if (target.getAttribute('height')) img.setAttribute('height', target.getAttribute('height')!);

         return img;
    }
    ```
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
    - Run `npm run test packages/player`.
- **Success Criteria**:
    - The new test case in `dom-capture.test.ts` passes.
    - The test should create a `<video>` element, mock its drawing to a canvas (ensure `videoWidth` is mocked), and verify the output SVG contains an `<img>` with a Data URI instead of the `<video>` tag.
- **Edge Cases**:
    - Video hasn't loaded metadata (`videoWidth` is 0) -> Should default to `clientWidth` or fallback.
    - Video has css transforms -> Should be preserved by style copying.
