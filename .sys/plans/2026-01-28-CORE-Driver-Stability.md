# 2026-01-28 - CORE - Implement Driver Stability API

#### 1. Context & Goal
- **Objective**: Implement a `waitUntilStable()` method in the `TimeDriver` interface and `Helios` class to allow awaiting DOM readiness (media seeking, fonts) after a seek.
- **Trigger**: The vision for "Client-Side WebCodecs as Primary Export" requires a deterministic way to wait for the DOM to settle (e.g., video seek completion, font loading) before capturing frames. Currently, `Helios.seek()` is synchronous and assumes immediate updates, which causes race conditions during export.
- **Impact**: Unlocks frame-accurate client-side rendering and testing by providing a hook to wait for async browser states.

#### 2. File Inventory
- **Modify**: `packages/core/src/drivers/TimeDriver.ts` (Add `waitUntilStable` to interface)
- **Modify**: `packages/core/src/drivers/DomDriver.ts` (Implement stability logic)
- **Modify**: `packages/core/src/drivers/WaapiDriver.ts` (Implement logic/no-op)
- **Modify**: `packages/core/src/drivers/NoopDriver.ts` (Implement no-op)
- **Modify**: `packages/core/src/index.ts` (Add method to `Helios` class)
- **Modify**: `packages/core/src/drivers/DomDriver.test.ts` (Add tests for stability logic)

#### 3. Implementation Spec
- **Architecture**:
  - The `TimeDriver` interface will be extended with an optional `waitUntilStable` method.
  - `DomDriver` will implement this by aggregating promises from:
    1. `HTMLMediaElement`s: Wait for `seeked` event if `seeking` or `readyState < HAVE_CURRENT_DATA`.
    2. `WAAPI`: Wait for `Animation.ready` promise.
    3. `Fonts`: Wait for `document.fonts.ready` promise.
  - `Helios` will expose a public `waitUntilStable()` method that delegates to the driver.

- **Pseudo-Code**:
```typescript
// TimeDriver.ts
export interface TimeDriver {
  // ... existing methods
  waitUntilStable?(): Promise<void>;
}

// DomDriver.ts
async waitUntilStable() {
  const promises: Promise<any>[] = [];

  // 1. Check Media Elements
  this.mediaElements.forEach(el => {
    // If seeking or not enough data to render frame
    if (el.seeking || el.readyState < 2) {
      promises.push(new Promise<void>(resolve => {
         const onReady = () => {
           el.removeEventListener('seeked', onReady);
           el.removeEventListener('canplay', onReady);
           el.removeEventListener('error', onReady); // Don't hang on error
           resolve();
         };
         el.addEventListener('seeked', onReady);
         el.addEventListener('canplay', onReady);
         el.addEventListener('error', onReady);
      }));
    }
  });

  // 2. Check WAAPI Animations
  if (this.scope) {
     const anims = this.getAnimationsFromScope(); // helper
     anims.forEach(anim => promises.push(anim.ready));
  }

  // 3. Check Fonts
  if (typeof document !== 'undefined' && document.fonts) {
    promises.push(document.fonts.ready);
  }

  await Promise.all(promises);
}

// Helios.ts
public async waitUntilStable() {
  if (this.driver.waitUntilStable) {
    await this.driver.waitUntilStable();
  }
}
```

- **Public API Changes**:
  - `Helios` class: Added `waitUntilStable(): Promise<void>`.
  - `TimeDriver` interface: Added `waitUntilStable?(): Promise<void>`.

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `DomDriver.test.ts` passes:
    - `waitUntilStable` resolves immediately if no media/animations.
    - `waitUntilStable` waits if `video.seeking` is true.
    - `waitUntilStable` waits if `video.readyState` is 0 or 1.
    - `waitUntilStable` resolves when `seeked` fires.
  - Integration: `Helios` instance successfully calls down to driver.
- **Edge Cases**:
  - JSDOM environment quirks (mocking `document.fonts`, `Animation.ready`).
  - Media error events (should resolve, not reject, to avoid hanging).
