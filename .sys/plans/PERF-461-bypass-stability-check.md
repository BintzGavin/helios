---
id: PERF-461
slug: bypass-stability-check
status: complete
claimed_by: "jules"
created: 2024-06-03
completed: "2026-05-09"
result: "keep"
---

# PERF-461: Bypass Runtime.evaluate Stability Check in CdpTimeDriver When Unused

## Focus Area
`CdpTimeDriver.ts` inside the hot loop (`runSetTime`).

## Background Research
Currently, `CdpTimeDriver` executes a `Runtime.evaluate` call to `window.__helios_wait_until_stable()` on *every single frame* and wraps it in a `Promise.race` with a Node.js `setTimeout` for safety. This incurs IPC overhead, V8 garbage collection churn (from new Promises and closures), and event loop delays.
Most compositions do not define a custom `window.helios.waitUntilStable` function. In PERF-460, we successfully bypassed the media sync `Runtime.evaluate` call via closure assignment during initialization, which yielded a render time improvement. Applying the exact same pattern to the stability check will eliminate another unnecessary CDP call per frame, reducing the CDP chatter in the hot loop from 3 calls per frame down to 2 for standard compositions.

## Benchmark Configuration
- **Composition URL**: A standard benchmark composition.
- **Render Settings**: 1280x720, 30fps, 3s duration (90 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Unnecessary `Runtime.evaluate` IPC overhead and `Promise.race` allocation for non-existent stability checks.

## Implementation Spec

### Step 1: Conditionally define the stability check execution path
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Add a private property `stabilityCheckFn` to the `CdpTimeDriver` class, initialized to return a resolved promise or execute immediately.
2. Move the stability checking logic (from `const evaluatePromise = ...` to the end of the `finally` block) inside `runSetTime` into a new private method, `defaultStabilityCheck(): Promise<void>`.
3. In `prepare(page: Page)`, use `waitForFunction` to ensure initialization finishes if a global object like `helios` or a custom timeline exists.
4. During `prepare`, check for the stability function using the CDP client:
   `const { result } = await this.client!.send('Runtime.evaluate', { expression: "typeof window.helios !== 'undefined' && typeof window.helios.waitUntilStable === 'function'", returnByValue: true });`
5. If it exists, assign `this.stabilityCheckFn = this.defaultStabilityCheck.bind(this);`.
6. Update `runSetTime` to simply call `this.stabilityCheckFn()`.

**Why**: Removes the `Runtime.evaluate` call, `Promise.race`, and timeout timers for standard compositions without adding branch checks to the hot loop.
**Risk**: If `window.helios.waitUntilStable` is injected *after* initialization, it won't be called. Since Helios APIs are typically defined synchronously at the top level of the composition, this risk is negligible.

## Variations
None.

## Canvas Smoke Test
Run `cd packages/renderer && npx tsx tests/verify-cdp-driver.ts` to ensure no regressions in time synchronization.

## Correctness Check
Run the DOM render benchmark script (`npm run build:examples && cd packages/renderer && npx tsx scripts/render-dom.ts` or similar) to verify the speedup and ensure successful render completion.

## Prior Art
- PERF-460: Successfully bypassed `Runtime.evaluate` for media sync using closure assignment.


## Results Summary
```
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	3.837	150	39.09	39	keep	bypass stability check Runtime.evaluate via closure
2	4.012	150	37.39	39	keep	bypass stability check Runtime.evaluate via closure
3	3.791	150	39.57	39	keep	bypass stability check Runtime.evaluate via closure```
