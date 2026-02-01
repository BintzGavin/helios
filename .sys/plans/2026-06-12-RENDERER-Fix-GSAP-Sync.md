# Fix GSAP Timeline Synchronization in SeekTimeDriver

#### 1. Context & Goal
- **Objective**: Fix a critical bug in `SeekTimeDriver` where `gsapTimelineSeeked` causes a ReferenceError and the GSAP timeline is missed during initial frame rendering due to async loading.
- **Trigger**: Backlog item "Fix GSAP Timeline Synchronization in SeekTimeDriver" and `docs/status/RENDERER.md`.
- **Impact**: Ensures `examples/promo-video` and other GSAP-based compositions render correctly without black frames at the start.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
  - Initialize `gsapTimelineSeeked` variable to fix ReferenceError.
  - Add logic to `prepare()` to wait for GSAP timeline availability.

#### 3. Implementation Spec
- **Architecture**:
  - Update `SeekTimeDriver.prepare` to proactively wait for `window.__helios_gsap_timeline__` if it appears within a short timeout (1000ms). This handles the race condition where `main.js` (ES module) hasn't finished executing when rendering starts.
  - Update `SeekTimeDriver.setTime` to define the missing `gsapTimelineSeeked` variable in the injected script scope.

- **Pseudo-Code**:
  ```typescript
  // In packages/renderer/src/drivers/SeekTimeDriver.ts

  class SeekTimeDriver {
    // ...

    async prepare(page: Page): Promise<void> {
      // WAITS for window.__helios_gsap_timeline__ to be defined
      // TIMEOUT 1000ms
      // CATCH error (ignore timeout if not using GSAP)
      /*
      try {
        await page.waitForFunction(
          () => typeof (window as any).__helios_gsap_timeline__ !== 'undefined',
          { timeout: 1000 }
        );
      } catch (e) {
        // Ignore - likely not a GSAP project
      }
      */
    }

    async setTime(page: Page, timeInSeconds: number): Promise<void> {
      const script = `
        (async (t, timeoutMs) => {
          // INITIALIZE variable to prevent ReferenceError
          let gsapTimelineSeeked = false;

          // ... existing logic ...

          // UPDATE the GSAP seek logic to be safe
          if (!gsapTimelineSeeked && window.__helios_gsap_timeline__ && typeof window.__helios_gsap_timeline__.seek === 'function') {
             // SEEK logic
             gsapTimelineSeeked = true;
          }

          // ... rest of script ...
        })(${timeInSeconds}, ${this.timeout})
      `;
      // ...
    }
  }
  ```

- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npx tsx examples/promo-video/render.ts`
  - (Prerequisite: Ensure `npm run build -w packages/core` and `npx playwright install` if needed, though environment should have them).
- **Success Criteria**:
  - `examples/promo-video/output/helios-promo.mp4` is generated.
  - The video is NOT black (size > minimal).
  - Ideally manually inspectable, but existence and non-zero size confirms the render pipeline didn't crash or produce empty frames due to the ReferenceError.
- **Edge Cases**:
  - Non-GSAP projects should not hang for 1000ms (waitForFunction should be skipped or timeout ignored quickly? No, `waitForFunction` blocks until condition OR timeout. So non-GSAP projects WILL delay by 1s. This is a trade-off for the fix. Ideally, we'd only wait if we suspect GSAP, but we can't know.)
  - *Refinement*: Maybe 500ms is enough? The backlog says `main.js` is async. 1000ms is safer. 1s render startup delay is acceptable for a Renderer.
