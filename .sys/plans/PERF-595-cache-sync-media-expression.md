---
id: PERF-595
slug: eliminate-sync-media-expression-allocation
status: unclaimed
claimed_by: ""
created: 2024-05-26
completed: ""
result: ""
---

# PERF-595: Eliminate Dynamic String Allocation for Sync Media Expression

## Focus Area
DOM Rendering Pipeline - CDP Hot Loop (`packages/renderer/src/drivers/CdpTimeDriver.ts`).

## Background Research
In the `CdpTimeDriver.ts` hot loop (`defaultSyncMedia` function), a JavaScript expression string is dynamically generated on every single frame using string concatenation:
```typescript
const expression = "window.__helios_sync_media(" + timeInSeconds + ");";
```
This forces V8 to repeatedly allocate, compile, and garbage-collect new strings thousands of times per render. Previous experiments (`PERF-537`, `PERF-538`) showed that switching from `Runtime.evaluate` to `Runtime.callFunctionOn` regressed performance because of CDP object serialization overhead.

However, since `timeInSeconds` is deterministic and based on `frameIndex * timeStep`, we can avoid string concatenation completely by passing the time via a pre-set Javascript global variable (or tracking the frame step locally in the browser context) and evaluating a static string.

A simple optimization that avoids both string allocation in Node and execution context side effects is to pre-allocate an array of strings mapping frame indices to their evaluated expression strings. However, `CdpTimeDriver` receives `timeInSeconds` and does not easily have the frame index.

An even simpler and safer optimization is to just use a statically sized array as an LRU cache or just a pre-allocated cache Map for the concatenated strings. But an even better approach without maps is to inject the time directly via a static evaluation:
Wait, `Runtime.evaluate` supports executing an expression. If we just assign the time to a window variable in the browser and then call the function?
No, assigning a variable is also string concatenation: `window.t=${time};window.__helios_sync_media(window.t);`.

What if we inject a function in the browser that maintains its own internal time and increments it automatically based on the frame interval? `CdpTimeDriver.ts` doesn't know the frame interval, but it does know the target `timeInSeconds`.

Let's use a `Map<number, string>` to cache the generated strings in `CdpTimeDriver.ts`.
```typescript
private expressionCache = new Map<number, string>();

private defaultSyncMedia(timeInSeconds: number) {
    let expression = this.expressionCache.get(timeInSeconds);
    if (!expression) {
        expression = "window.__helios_sync_media(" + timeInSeconds + ");";
        this.expressionCache.set(timeInSeconds, expression);
    }
    // ... use expression
```
Since the set of `timeInSeconds` is extremely small and deterministic (e.g., 0.03333, 0.06666, up to duration), the Map will only store as many entries as there are frames in the composition. The Map lookup will avoid allocating a new string on the heap for every worker iteration, heavily reducing GC pressure in the hot loop.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition (`examples/dom-benchmark`)
- **Render Settings**: 600x600, 30fps, 5s duration, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.374s (from RENDERER-EXPERIMENTS.md current best)
- **Bottleneck analysis**: V8 string allocation overhead and garbage collection in the CDP hot loop.

## Implementation Spec

### Step 1: Add string caching to `CdpTimeDriver.ts`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Add `private expressionCache = new Map<number, string>();` to the `CdpTimeDriver` class.
2. Inside `defaultSyncMedia`, check if the string for `timeInSeconds` exists in `this.expressionCache`.
3. If not, generate it `const expr = "window.__helios_sync_media(" + timeInSeconds + ");"` and store it in the map.
4. Replace the inline concatenations (`this.singleFrameSyncMediaParams.expression = "window.__helios_sync_media(" + timeInSeconds + ");";` and `const expression = "window.__helios_sync_media(" + timeInSeconds + ");";`) with the cached string `this.expressionCache.get(timeInSeconds)`.

**Why**: Reusing pre-allocated static strings instead of repeatedly concatenating new ones for identical timestamps avoids creating short-lived string objects on the V8 heap thousands of times per render. This prevents unnecessary GC pauses and CPU cycles spent on string compilation.
**Risk**: If `timeInSeconds` is not perfectly deterministic (e.g., floating point imprecision), the cache could grow unbounded. However, `timeInSeconds` is calculated from an integer index and a fixed `compTimeStep` in `CaptureLoop.ts` (`const compositionTimeInSeconds = (this.startFrame + i) * compTimeStep;`), so the set of values is small and bounded.

## Correctness Check
Run the `npx tsx packages/renderer/tests/fixtures/benchmark.ts` script to test performance, followed by `npm run test -w packages/renderer -- --run` to verify correctness and ensure media synchronization continues to work properly.
