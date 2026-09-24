---
id: PERF-978
slug: pipeline-single-worker-canvas-strategy
status: complete
claimed_by: "perf-978-executor"
created: 2024-07-12
completed: ""
result: ""
---

# PERF-978: Pipeline strategy capture before CPU processing in single-worker Canvas loops

## Focus Area
The single-worker Canvas strategy chunk loops (`isDomStrategy = false` in both `hasProcessFn = true` and `hasProcessFn = false` branches) within `CaptureLoop.ts`.

## Background Research
In PERF-976, an attempt was made to pipeline the single-worker Canvas path by overlapping `processCaptureResult` and `stream.write` with `timePromise`. However, in the Canvas strategy, `timeDriver.setTime()` uses `MockTimeDriver` which is entirely synchronous (returns `null`). As a result, the CPU-bound processing blocks the Node.js event loop *before* `strategy.capture()` is dispatched, preventing any actual overlap with Chromium's heavy capture phase.
To achieve true parallel execution, we must dispatch `strategy.capture()` *before* executing the CPU-bound `processCaptureResult` and `stream.write()`. This allows Node.js to process frame `N` and check stream backpressure while Chromium is concurrently capturing frame `N+1`.

## Benchmark Configuration
- **Composition URL**: Standard Canvas benchmark
- **Render Settings**: Standard
- **Mode**: `canvas` (single-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The browser sits idle while Node.js performs synchronous Canvas processing, buffer manipulation, and stream backpressure yielding. Pipelining these operations to overlap with `strategy.capture()` will maximize CPU and I/O overlap, hiding CPU processing time inside the browser's capture time.

## Implementation Spec

### Step 1: Pipeline chunk loop in `hasProcessFn = true` Canvas path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the single-worker chunk loop for Canvas when `hasProcessFn` is true (around line 351).
Change the loop body order from:
```typescript
                    const timePromise = timeDriver.setTime(...);
                    let buf;
                    buf = strategy.processCaptureResult!(rawResult);
                    pendingBytes += (buf as any).length;
                    const writeSuccessBuf = stream.write(buf as any);
                    if (timePromise) await timePromise;
                    nextCapturePromise = strategy.capture(...);
                    if (writeSuccessBuf) {} else if (pendingBytes >= 16777216) { ... }
```
To:
```typescript
                    const timePromise = timeDriver.setTime(
                      page,
                      (startFrame + i + 1) * compTimeStep,
                    );
                    if (timePromise) await timePromise;
                    nextCapturePromise = strategy.capture(
                      page,
                      (i + 1) * timeStep,
                    );

                    let buf;
                    buf = strategy.processCaptureResult!(rawResult);
                    pendingBytes += (buf as any).length;
                    const writeSuccessBuf = stream.write(buf as any);

                    if (writeSuccessBuf) {} else if (pendingBytes >= 16777216) {
                      await this.drainPromise;
                      pendingBytes = 0;
                    }
```
*Also do this for the initial/final frame setups if they suffer from the same inverted order.*

### Step 2: Pipeline chunk loop in `hasProcessFn = false` Canvas path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the single-worker chunk loop for Canvas when `hasProcessFn` is false (around line 560).
Change the loop body order from:
```typescript
                    const timePromise = timeDriver.setTime(...);
                    pendingBytes += (buf as any).length;
                    const writeSuccessBuf = stream.write(buf as any);
                    if (timePromise) await timePromise;
                    nextCapturePromise = strategy.capture(...);
                    if (writeSuccessBuf) {} else if (pendingBytes >= 16777216) { ... }
```
To:
```typescript
                    const timePromise = timeDriver.setTime(
                      page,
                      (startFrame + i + 1) * compTimeStep,
                    );
                    if (timePromise) await timePromise;
                    nextCapturePromise = strategy.capture(
                      page,
                      (i + 1) * timeStep,
                    );

                    pendingBytes += (buf as any).length;
                    const writeSuccessBuf = stream.write(buf as any);

                    if (writeSuccessBuf) {} else if (pendingBytes >= 16777216) {
                      await this.drainPromise;
                      pendingBytes = 0;
                    }
```

**Why**: By dispatching the asynchronous frame capture command before synchronously blocking the CPU for processing and stream writes, we pipeline the Chromium IPC and browser rendering with Node's CPU/IO work.

## Correctness Check
Run `npm test -w packages/renderer` to ensure `run-all.ts` still passes.
