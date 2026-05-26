---
id: PERF-591
slug: merge-promise-catch-handlers
status: unclaimed
claimed_by: ""
created: 2024-05-25
completed: ""
result: ""
---

# PERF-591: Merge Promise Catch Handlers in Hot Loops

## Focus Area
DOM Rendering Pipeline - Promise allocations in `packages/renderer/src/core/CaptureLoop.ts` and `packages/renderer/src/strategies/DomStrategy.ts`.

## Background Research
In V8, every chained `.then()` or `.catch()` on a Promise allocates a new Promise object and schedules a new microtask closure. For a chain like `.then(onFulfilled).catch(onRejected)`, two intermediate Promises are created. By merging the error handler into the second argument of the preceding `.then()`, i.e., `.then(onFulfilled, onRejected)`, only one Promise is allocated.

Since these chains are executed in the extremely hot per-frame capture loop (often concurrently across multiple workers), eliminating the trailing `.catch()` Promise allocation should reduce V8 garbage collection pressure and microtask overhead without changing the error-handling semantics (since the preceding `onFulfilled` handlers only contain simple assignments that do not throw).

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition (`examples/dom-benchmark`)
- **Render Settings**: 600x600, 30fps, 5s duration, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.229s (from PERF-590)
- **Bottleneck analysis**: Microtask and Promise allocation overhead in the multi-worker hot loop.

## Implementation Spec

### Step 1: Merge Catch in `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the `runWorker` promise chain around line 187:
```typescript
            await timePromise
                .then(() => strategy.capture(page, time))
                .then((buffer) => {
                    frameBufferRing[ringIndex] = buffer;
                    frameReadyRing[ringIndex] = 1;
                })
                .catch((e) => {
                    frameErrorRing[ringIndex] = e;
                    frameReadyRing[ringIndex] = 1;
                });
```
Replace it with the two-argument `.then(onFulfilled, onRejected)`:
```typescript
            await timePromise
                .then(() => strategy.capture(page, time))
                .then(
                    (buffer) => {
                        frameBufferRing[ringIndex] = buffer;
                        frameReadyRing[ringIndex] = 1;
                    },
                    (e) => {
                        frameErrorRing[ringIndex] = e;
                        frameReadyRing[ringIndex] = 1;
                    }
                );
```
**Why**: Eliminates the allocation of the final `.catch()` Promise while maintaining equivalent error catching for the `strategy.capture()` and `timePromise` rejections.
**Risk**: If the `onFulfilled` handler (buffer assignment) were to throw an exception, it would not be caught by its sibling `onRejected` handler. However, it's a simple array assignment and `1` assignment, which is guaranteed not to throw.

### Step 2: Merge Catch in `DomStrategy.ts`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Locate the two `capture` method promise chains (one for `this.targetBeginFrameParams` and one for `this.beginFrameParams`) around line 170.
Currently they look like this:
```typescript
    return this.cdpSession!.send('HeadlessExperimental.beginFrame', ...)
      .then(result => {
        if (result.screenshotData) {
          this.lastFrameData = result.screenshotData;
        }
        return this.lastFrameData!;
      })
      .catch(e => {
        return this.lastFrameData!;
      });
```
Change both to use the two-argument `.then`:
```typescript
    return this.cdpSession!.send('HeadlessExperimental.beginFrame', ...)
      .then(
        result => {
          if (result.screenshotData) {
            this.lastFrameData = result.screenshotData;
          }
          return this.lastFrameData!;
        },
        e => {
          return this.lastFrameData!;
        }
      );
```
**Why**: Reduces Promise allocation overhead during the high-frequency CDP `beginFrame` capture IPC phase.
**Risk**: Very low; object property assignment won't throw synchronously in the success branch.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` or `npm start` with a canvas composition to ensure no syntax errors break the worker initialization.

## Correctness Check
The resulting DOM composition should still render correctly without throwing unhandled promise rejections.

## Prior Art
- PERF-584 inlined `try/catch` into `.then().catch()` successfully. This further refines that win.
- V8 Promise optimization guidelines recommend `.then(success, error)` to avoid extra Promise allocation when `success` is infallible.