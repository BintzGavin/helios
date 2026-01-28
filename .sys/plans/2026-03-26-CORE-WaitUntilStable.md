# Plan: Implement WaitUntilStable Mechanism

## 1. Context & Goal
- **Objective**: Implement a `waitUntilStable()` mechanism in the `Helios` engine and `DomDriver` to ensure deterministic rendering.
- **Trigger**: The renderer currently lacks a reliable way to know when asynchronous DOM operations (media seeking, image loading, font loading) are complete after a `seek()`. This causes race conditions and visual artifacts.
- **Impact**: Unlocks reliable frame capturing for `packages/renderer`, ensuring videos are rendered without artifacts. This is a critical prerequisite for the "Native Always Wins" thesis to work reliably in production.

## 2. File Inventory
- **Modify**: `packages/core/src/drivers/TimeDriver.ts` (Add `waitUntilStable` to interface)
- **Modify**: `packages/core/src/drivers/DomDriver.ts` (Implement stability logic)
- **Modify**: `packages/core/src/drivers/NoopDriver.ts` (Implement no-op)
- **Modify**: `packages/core/src/drivers/WaapiDriver.ts` (Implement no-op, despite deprecation)
- **Modify**: `packages/core/src/helios.ts` (Expose `waitUntilStable` method)
- **Modify**: `packages/core/src/drivers/DomDriver.test.ts` (Add unit tests)

## 3. Implementation Spec
- **Architecture**:
  - Update `TimeDriver` interface to include `waitUntilStable(): Promise<void>`.
  - `DomDriver` implements this method to aggregate multiple promises:
    1.  **Fonts**: `document.fonts.ready`.
    2.  **Images**: Iterate over `document.images` (in scope) and await `img.decode()`.
    3.  **Media**: Iterate over tracked `mediaElements`. For each:
        - If `el.error`, reject or warn.
        - If `el.seeking`, wait for `seeked` event.
        - If `el.readyState < 2` (HAVE_CURRENT_DATA), wait for `canplay` or `canplaythrough`.
  - `Helios` exposes a public `async waitUntilStable()` which delegates to `this.driver.waitUntilStable()`.

- **Pseudo-Code (DomDriver)**:
  ```typescript
  async waitUntilStable(): Promise<void> {
    if (!this.scope) return;

    // 1. Fonts
    // Use document.fonts.ready if available (global)
    const fontPromise = document.fonts ? document.fonts.ready : Promise.resolve();

    // 2. Images
    // Helper to query images in scope
    const getImages = () => {
       if (this.scope instanceof Document) return Array.from(this.scope.images);
       return Array.from(this.scope.querySelectorAll('img'));
    };

    const imagePromises = getImages().map(img => img.decode().catch(() => {}));

    // 3. Media
    const mediaPromises = Array.from(this.mediaElements).map(el => {
      return new Promise<void>((resolve) => {
        if (el.error) return resolve(); // Don't block on error

        // Check if ready
        // readyState 2 = HAVE_CURRENT_DATA
        const isReady = !el.seeking && el.readyState >= 2;
        if (isReady) return resolve();

        // Listen for events
        const onReady = () => {
             cleanup();
             resolve();
        };

        const onError = () => {
            cleanup();
            resolve();
        };

        const cleanup = () => {
            el.removeEventListener('seeked', onReady);
            el.removeEventListener('canplay', onReady);
            el.removeEventListener('error', onError);
        };

        el.addEventListener('seeked', onReady);
        el.addEventListener('canplay', onReady);
        el.addEventListener('error', onError);
      });
    });

    await Promise.all([fontPromise, ...imagePromises, ...mediaPromises]);
  }
  ```

- **Public API Changes**:
  - `Helios` class: `public async waitUntilStable(): Promise<void>`
  - `TimeDriver` interface: `waitUntilStable(): Promise<void>`

- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npm test -w packages/core`
- **Success Criteria**:
  - `DomDriver.test.ts` should pass new tests that verify:
    - `waitUntilStable` resolves immediately if no media.
    - `waitUntilStable` blocks if a media element is `seeking`.
    - `waitUntilStable` resolves once the media element emits `seeked`.
- **Edge Cases**:
  - Verify behavior when media elements fail to load (should gracefully resolve or timeout, but for this spec, grace is preferred).
  - Verify behavior with no scope or detached scope.
