---
id: PERF-598
slug: cache-sync-media-expression
status: unclaimed
claimed_by: ""
created: 2024-05-27
completed: ""
result: ""
---

# PERF-598: Cache sync media CDP expression in CdpTimeDriver

## Focus Area
DOM Rendering Pipeline - CDP Hot Loop (`packages/renderer/src/drivers/CdpTimeDriver.ts`).

## Background Research
In the `CdpTimeDriver.ts` hot loop (`defaultSyncMedia` function), a JavaScript expression string is dynamically generated on every single frame using string concatenation:
```typescript
const expression = "window.__helios_sync_media(" + timeInSeconds + ");";
```
This forces V8 to repeatedly allocate, compile, and garbage-collect new strings thousands of times per render. Previous experiments (`PERF-537`, `PERF-538`) showed that switching from `Runtime.evaluate` to `Runtime.callFunctionOn` regressed performance because of CDP object serialization overhead.

A simple optimization that avoids both string allocation in Node and execution context side effects is to pre-allocate an array of strings mapping frame indices to their evaluated expression strings, but because `CdpTimeDriver` does not have access to the frame index, using a simple `Map` keyed by `timeInSeconds` is an excellent substitute.
Since the set of `timeInSeconds` is extremely small and deterministic, the Map will only store as many entries as there are frames in the composition. The Map lookup will avoid allocating a new string on the heap for every worker iteration, heavily reducing GC pressure in the hot loop.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition (`examples/dom-benchmark`)
- **Render Settings**: 600x600, 30fps, 5s duration, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.267s (from RENDERER-EXPERIMENTS.md current best)
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
Run the `npx tsx packages/renderer/scripts/benchmark-perf.ts` script to test performance, followed by `npm run test -w packages/renderer` to verify correctness and ensure media synchronization continues to work properly.
