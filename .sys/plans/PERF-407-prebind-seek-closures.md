---
id: PERF-407
slug: prebind-seek-closures
status: unclaimed
claimed_by: ""
created: 2024-05-01
completed: ""
result: ""
---

# PERF-407: Prebind Promise Executor and Resolver Closures in SeekTimeDriver

## Focus Area
`packages/renderer/src/drivers/SeekTimeDriver.ts` - Browser `__helios_seek` injected script.

## Background Research
During the single-frame DOM capture hot loop, `SeekTimeDriver` invokes `window.__helios_seek` via Playwright CDP. Within this function, if there are any promises in `cachedPromises` (which is almost always true due to custom `waitUntilStable` hooks), the script allocates two closures dynamically:
1. `(resolve) => { timeoutId = setTimeout(resolve, timeoutMs); }` (Executor for `new Promise`)
2. `() => { clearTimeout(timeoutId); ... }` (Resolver for `.then()`)

These inline arrow functions are allocated on the V8 heap on *every single frame*. Previous experiments (like PERF-383 and PERF-406) have proven that moving such dynamic allocations out of the hot loop into pre-bound outer-scope variables significantly reduces garbage collection pressure and improves median render times in our CPU-bound microVM environment.

## Benchmark Configuration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~34.041s
- **Bottleneck analysis**: The dynamically allocated closures inside `window.__helios_seek` cause V8 garbage collection churn on every frame.

## Implementation Spec

### Step 1: Hoist state and closures to the outer IIFE scope
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In the `initScript` string, inside the IIFE scope (just after `const cachedPromises = [];`), add the shared state and the prebound closures:

\`\`\`javascript
        let _timeoutId;
        let _timeoutMs;
        let _seekT;
        let _gsapSeeked;
        let _heliosSeeked;

        const _timeoutExecutor = (resolve) => {
          _timeoutId = setTimeout(resolve, _timeoutMs);
        };

        const _onRaceResolved = () => {
          clearTimeout(_timeoutId);

          if (_gsapSeeked && window.__helios_gsap_timeline__ && typeof window.__helios_gsap_timeline__.seek === 'function') {
            try {
              window.__helios_gsap_timeline__.seek(_seekT);
            } catch (gsapError) {
              console.error('[SeekTimeDriver] Error seeking GSAP timeline:', gsapError);
            }
          }

          if (_heliosSeeked && typeof window.helios !== 'undefined' && window.helios.seek) {
            try {
              const helios = window.helios;
              const fps = helios.fps ? helios.fps.value : 30;
              const frame = Math.floor(_seekT * fps);
              helios.seek(frame);
            } catch (e) {
              console.warn('[SeekTimeDriver] Error seeking Helios:', e);
            }
          }
        };
\`\`\`
**Why**: This moves the function object allocation out of the hot loop. The state is safe to share because `window.__helios_seek` is strictly sequentially awaited per page context.

### Step 2: Replace dynamic closures in `window.__helios_seek`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Inside `window.__helios_seek`, find the stability wait block:
\`\`\`javascript
          // 4. Wait for stability with a safety timeout (only if needed)
          if (cachedPromises.length > 0) {
            let timeoutId;
            const allReady = Promise.all(cachedPromises);
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
\`\`\`
Replace it with:
\`\`\`javascript
          // 4. Wait for stability with a safety timeout (only if needed)
          if (cachedPromises.length > 0) {
            _timeoutMs = timeoutMs;
            _seekT = t;
            _gsapSeeked = gsapTimelineSeeked;
            _heliosSeeked = heliosSeeked;

            const allReady = Promise.all(cachedPromises);
            const timeoutPromise = new Promise(_timeoutExecutor);
            return Promise.race([allReady, timeoutPromise]).then(_onRaceResolved);
          }
\`\`\`

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` to ensure core rendering functions are untouched.

## Correctness Check
Run `npx tsx tests/verify-seek-driver-stability.ts` to ensure the timeout still fires correctly with the prebound variables and execution contexts don't leak.
