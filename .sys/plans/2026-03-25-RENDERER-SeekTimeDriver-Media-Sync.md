# Plan: Implement Media Element Synchronization in SeekTimeDriver

## 1. Context & Goal
- **Objective**: Ensure `<video>` and `<audio>` elements are synchronized with the virtual timeline during DOM rendering (when using `SeekTimeDriver`).
- **Trigger**: `DomStrategy` relies on `SeekTimeDriver` (WAAPI polyfill) instead of CDP for rendering. Currently, `SeekTimeDriver` mocks `performance.now` and `Date.now` but fails to control media elements, causing them to drift or play at wall-clock speed during slow frame capture.
- **Impact**: Enables robust rendering of HTML5 video/audio content in "DOM Mode", fulfilling the vision of "Native Always Wins" and "Use What You Know".

## 2. File Inventory
- **Modify**: `packages/renderer/src/drivers/SeekTimeDriver.ts` (Implement media sync logic in `setTime`)
- **Create**: `packages/renderer/tests/verify-media-sync.ts` (Verification script)

## 3. Implementation Spec
- **Architecture**: Update `SeekTimeDriver.setTime` to query all `video` and `audio` elements and manually force them to the target virtual time.
- **Pseudo-Code**:
  ```typescript
  // In SeekTimeDriver.setTime(page, timeInSeconds)
  await page.evaluate((t) => {
    // ... existing WAAPI sync ...

    const media = document.querySelectorAll('video, audio');
    for (const el of media) {
       el.pause();
       el.currentTime = t;
       // We skip explicit 'seeked' wait for MVP performance, relying on DomStrategy preloading
       // to ensure buffering. Correctness is improved by setting currentTime.
    }
  }, timeInSeconds);
  ```
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npx ts-node packages/renderer/tests/verify-media-sync.ts`
- **Success Criteria**: The verification script (which will render a page with a tracked `<video>` element) confirms that the video's `currentTime` matches the requested frame time for every frame.
- **Edge Cases**:
  - Empty page (no media).
  - Media not loaded (should not crash).
  - Multiple media elements.
