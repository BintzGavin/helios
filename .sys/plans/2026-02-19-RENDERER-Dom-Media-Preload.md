# 2026-02-19-RENDERER-Dom-Media-Preload

## 1. Context & Goal
- **Objective**: Update `DomStrategy` to ensure all `HTMLMediaElement` (video/audio) tags in the composition are fully loaded and buffered before rendering begins.
- **Trigger**: Currently, `DomStrategy` waits for fonts and images, but ignores `<video>` and `<audio>` elements. This can lead to blank frames or loading states appearing in the final render if the media hasn't buffered by the time the first frame is captured.
- **Impact**: Increases the reliability of DOM-based rendering for compositions containing video or audio elements, preventing "pop-in" or blank media artifacts.

## 2. File Inventory
- **Create**: `packages/renderer/scripts/verify-dom-media-preload.ts` (Verification script)
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts` (Implement preloading logic)
- **Read-Only**: `packages/renderer/src/types.ts`

## 3. Implementation Spec
- **Architecture**: Extend the existing `prepare` phase in `DomStrategy` to include a check for media elements.
- **Pseudo-Code**:
  ```typescript
  // In DomStrategy.ts prepare(page) method, inside page.evaluate callback:

  // ... existing font/image waits ...

  // New Logic:
  const mediaElements = Array.from(document.querySelectorAll('video, audio'));
  if (mediaElements.length > 0) {
    console.log(`[DomStrategy] Preloading ${mediaElements.length} media elements...`);
    await Promise.all(mediaElements.map(el => {
      // Check if already ready (HAVE_ENOUGH_DATA = 4)
      if (el.readyState >= 4) return;

      return new Promise((resolve) => {
         let resolved = false;
         const finish = () => {
            if (resolved) return;
            resolved = true;
            // cleanup listeners if possible
            resolve(undefined);
         };

         // Listen for readiness
         el.addEventListener('canplaythrough', finish, { once: true });
         el.addEventListener('error', finish, { once: true });

         // Timeout fallback (e.g., 10 seconds)
         setTimeout(() => {
            if (!resolved) {
                console.warn('[DomStrategy] Timeout waiting for media element', el.src);
                finish();
            }
         }, 10000);
      });
    }));
    console.log('[DomStrategy] Media elements ready.');
  }
  ```
- **Public API Changes**: None.
- **Dependencies**: Ensure `packages/core` is built locally to satisfy module resolution for verification scripts (e.g., `npm run build -w packages/core`).

## 4. Test Plan
- **Verification**:
  - Run `npm run build -w packages/core` to ensure dependencies are ready.
  - Run `npx ts-node packages/renderer/scripts/verify-dom-media-preload.ts`.
  - The script will:
    1. Create a temporary HTML file with a `<video>` tag pointing to a public test video (e.g. `http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4` or similar).
    2. Instantiate `Renderer` with `mode: 'dom'` and the temp file path.
    3. Run `renderer.render()`.
    4. Capture stdout/stderr.
    5. Verify that the output log contains "Preloading" and "Media elements ready".
    6. Verify that `ffmpeg` was spawned and finished successfully.
- **Success Criteria**:
  - The render process does not error.
  - The `DomStrategy` logs "Preloading X media elements..." and "Media elements ready".
- **Edge Cases**:
  - Media fails to load (should log warning and continue after timeout).
  - No media elements (should skip gracefuly).
