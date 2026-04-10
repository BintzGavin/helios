---
id: PERF-238
slug: eliminate-async-wrappers
status: complete
claimed_by: ""
created: 2024-06-06
completed: ""
result: "Skipped: async wrappers already eliminated in codebase"
---
# PERF-238: Eliminate `async` wrappers in DOM render hot path

## Focus Area
DOM Rendering Pipeline - Hot Loop in `DomStrategy.ts` and `SeekTimeDriver.ts`.

## Background Research
In the DOM rendering pipeline, `DomStrategy.capture()` and the injected `window.__helios_seek` function execute on every single frame. Both currently utilize native `async/await` syntax.
While modern V8 optimizes `async/await` efficiently, allocating an async context and corresponding Promise objects for thousands of frames creates garbage collection pressure and micro-stalls within the hot loop.
Previous successful experiments (like PERF-230 and PERF-231) proved that eliminating `async` arrow function wrappers and rewriting them into native Promise chaining (or direct synchronous returns for fast paths) significantly reduces this overhead.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1920x1080, 60fps, 10s duration, libx264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.24s (reference from prior tests)
- **Bottleneck analysis**: Micro-stalls from V8 async context creation overhead inside Node.js and Chromium.

## Implementation Spec

### Step 1: Eliminate `async` from `DomStrategy.capture`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Rewrite the `capture` method to remove the `async` keyword and return a chained Promise directly instead of using `await`.
```typescript
<<<<<<< SEARCH
  async capture(page: Page, frameTime: number): Promise<Buffer | string> {
    if (this.targetElementHandle) {
      if (this.targetBeginFrameParams.screenshot.clip.width > 0) {
        this.targetBeginFrameParams.frameTimeTicks = 10000 + frameTime;

        const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams);
        if (res && res.screenshotData) {
          this.lastFrameData = res.screenshotData;
          return res.screenshotData;
        } else if (this.lastFrameData) {
          return this.lastFrameData;
        } else {
          this.lastFrameData = this.emptyImageBase64;
          return this.emptyImageBase64;
        }
      }
      const fallback = await this.targetElementHandle.screenshot((this as any).fallbackScreenshotOptions);
      this.lastFrameData = fallback as Buffer;
      return fallback as Buffer;
    }

    this.beginFrameParams.frameTimeTicks = 10000 + frameTime;
    const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
    if (res && res.screenshotData) {
      this.lastFrameData = res.screenshotData;
      return res.screenshotData;
    } else if (this.lastFrameData) {
      return this.lastFrameData;
    } else {
      this.lastFrameData = this.emptyImageBase64;
      return this.emptyImageBase64;
    }
  }
=======
  capture(page: Page, frameTime: number): Promise<Buffer | string> {
    if (this.targetElementHandle) {
      if (this.targetBeginFrameParams.screenshot.clip.width > 0) {
        this.targetBeginFrameParams.frameTimeTicks = 10000 + frameTime;

        return (this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams) as Promise<any>).then((res) => {
          if (res && res.screenshotData) {
            this.lastFrameData = res.screenshotData;
            return res.screenshotData;
          } else if (this.lastFrameData) {
            return this.lastFrameData;
          } else {
            this.lastFrameData = this.emptyImageBase64;
            return this.emptyImageBase64;
          }
        });
      }
      return this.targetElementHandle.screenshot((this as any).fallbackScreenshotOptions).then((fallback: Buffer) => {
        this.lastFrameData = fallback as Buffer;
        return fallback as Buffer;
      });
    }

    this.beginFrameParams.frameTimeTicks = 10000 + frameTime;
    return (this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams) as Promise<any>).then((res) => {
      if (res && res.screenshotData) {
        this.lastFrameData = res.screenshotData;
        return res.screenshotData;
      } else if (this.lastFrameData) {
        return this.lastFrameData;
      } else {
        this.lastFrameData = this.emptyImageBase64;
        return this.emptyImageBase64;
      }
    });
  }
>>>>>>> REPLACE
```
**Why**: Avoids `async` context generator overhead in Node.js event loop on every frame capture.

### Step 2: Eliminate `async` from injected `window.__helios_seek`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Remove the `async` keyword from the `window.__helios_seek` definition and implement native Promise returns for the slow paths only. This avoids wrapping synchronous fast-paths in unnecessary Promise resolving overhead inside Chromium.
```javascript
<<<<<<< SEARCH
        window.__helios_seek = async (t, timeoutMs) => {
=======
        window.__helios_seek = (t, timeoutMs) => {
>>>>>>> REPLACE
```
AND
```javascript
<<<<<<< SEARCH
          // 4. Wait for stability with a safety timeout (only if needed)
          if (promises && promises.length > 0) {
            let timeoutId;
            const allReady = Promise.all(promises);
            const timeoutPromise = new Promise((resolve) => {
              timeoutId = setTimeout(resolve, timeoutMs);
            });
            await Promise.race([allReady, timeoutPromise]);
            clearTimeout(timeoutId);

            // 5. After stability, ensure GSAP timelines are seeked again in case async changes occurred
            if (gsapTimelineSeeked && window.__helios_gsap_timeline__ && typeof window.__helios_gsap_timeline__.seek === 'function') {
              try {
                window.__helios_gsap_timeline__.seek(t);
              } catch (gsapError) {
                console.error('[SeekTimeDriver] Error seeking GSAP timeline:', gsapError);
              }
            }

            if (heliosSeeked && typeof window.helios !== 'undefined' && window.helios.seek) {
              try {
                const helios = window.helios;
                const fps = helios.fps ? helios.fps.value : 30;
                const frame = Math.floor(t * fps);
                helios.seek(frame);
              } catch (e) {
                console.warn('[SeekTimeDriver] Error seeking Helios:', e);
              }
            }
          }
        };
      })();
=======
          // 4. Wait for stability with a safety timeout (only if needed)
          if (promises && promises.length > 0) {
            let timeoutId;
            const allReady = Promise.all(promises);
            const timeoutPromise = new Promise((resolve) => {
              timeoutId = setTimeout(resolve, timeoutMs);
            });
            return Promise.race([allReady, timeoutPromise]).then(() => {
              clearTimeout(timeoutId);

              // 5. After stability, ensure GSAP timelines are seeked again in case async changes occurred
              if (gsapTimelineSeeked && window.__helios_gsap_timeline__ && typeof window.__helios_gsap_timeline__.seek === 'function') {
                try {
                  window.__helios_gsap_timeline__.seek(t);
                } catch (gsapError) {
                  console.error('[SeekTimeDriver] Error seeking GSAP timeline:', gsapError);
                }
              }

              if (heliosSeeked && typeof window.helios !== 'undefined' && window.helios.seek) {
                try {
                  const helios = window.helios;
                  const fps = helios.fps ? helios.fps.value : 30;
                  const frame = Math.floor(t * fps);
                  helios.seek(frame);
                } catch (e) {
                  console.warn('[SeekTimeDriver] Error seeking Helios:', e);
                }
              }
            });
          }
        };
      })();
>>>>>>> REPLACE
```
**Why**: Avoids `async` context generator overhead in Chromium's V8 engine. Fast path now returns `undefined`, drastically reducing CDP `awaitPromise` resolution overhead.

## Correctness Check
Run the DOM render benchmark script `npx tsx tests/fixtures/benchmark.ts` inside `packages/renderer` to verify performance and correctness.
Run `npm run test` inside `packages/renderer` to ensure no functionality is broken.

## Prior Art
PERF-230 and PERF-231, which also eliminated async/await wrappers in favor of native promise chains.
