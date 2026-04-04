---
id: PERF-174
slug: optimize-settime-promise
status: unclaimed
claimed_by: ""
created: 2025-05-24
completed: ""
result: ""
---

# PERF-174: Eliminate Promise Allocation for setTime Error Handling

## Focus Area
Frame capture hot loop in `packages/renderer/src/Renderer.ts`. This targets the secondary promise allocation created by the `.catch()` block attached to `worker.timeDriver.setTime()`.

## Background Research
In `PERF-168`, replacing `.catch(noopCatch)` on the outer `framePromise` with the two-argument `.then(undefined, noopCatch)` successfully eliminated secondary Promise allocations per frame, avoiding V8 generator overhead and GC stalls. However, the inner `setTime` call inside the `framePromise` closure still uses `.catch(noopCatch)`, creating an unnecessary Promise instance on every frame evaluation. Applying the same `.then(undefined, noopCatch)` optimization to this inner call should reduce GC pressure further.

## Benchmark Configuration
- **Composition URL**: `examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30 FPS, 5 seconds (150 frames), codec: libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.057s
- **Bottleneck analysis**: Micro-allocations in the hot loop. V8 allocates a new Promise object every time `.catch()` is called.

## Implementation Spec

### Step 1: Replace .catch() with .then(undefined, ...)
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
In the `captureLoop` definition, locate this line:
```typescript
worker.timeDriver.setTime(worker.page, compositionTimeInSeconds).catch(noopCatch);
```
Change it to:
```typescript
worker.timeDriver.setTime(worker.page, compositionTimeInSeconds).then(undefined, noopCatch);
```
**Why**: `.catch(fn)` is internally implemented as `.then(undefined, fn)`. Explicitly calling `.then()` with two arguments avoids allocating the intermediate `.catch` wrapper function/promise in V8, saving micro-allocations in the hot loop.
**Risk**: Extremely low. This is functionally identical to the existing code.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` or `npx tsx tests/benchmark.ts` against a canvas composition to ensure the renderer still functions without throwing unhandled promise rejections.

## Correctness Check
Run `npm run test -w packages/renderer` to ensure the tests still pass and the final video output is correct.

## Prior Art
- PERF-168 (Optimize activePromise .catch allocation)
