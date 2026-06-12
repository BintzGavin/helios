---
id: PERF-749
slug: hoist-try-catch-in-runworker
status: complete
claimed_by: "executor-session"
created: 2025-02-23
completed: 2025-02-23
result: no-improvement
---

# PERF-749: Hoist `try/catch` Outside the Concurrent Worker Hot Loop

## Focus Area
The `runWorker` asynchronous loop in `CaptureLoop.ts` (`poolLen > 1` branch). Specifically, moving the `try/catch` block that wraps the per-frame extraction out of the `while (!aborted)` loop.

## Background Research
Currently, the multi-worker actor model loop in `CaptureLoop.ts` evaluates a `try/catch` block inside the `while (!aborted)` loop on every single frame:
```typescript
        while (!aborted) {
            // ...
            try {
                await timeDriver.setTime(page, compositionTimeInSeconds);
                const rawResult = await strategy.capture(page, time);
                // ...
            } catch (e) {
                fatalError = e;
                aborted = true;
                checkState();
            }
            writerWaiterPromise.resolve();
        }
```
V8's TurboFan compiler has improved significantly, but having a `try/catch` block inside a tight, rapidly executing async `while` loop still adds AST complexity and exception handler mapping overhead for the JIT compiler per iteration. If an error occurs during frame rendering, it is considered a fatal rendering error, and we immediately abort the entire job (`aborted = true`, `checkState()`). There is no frame recovery logic. Thus, we can safely hoist the `try/catch` block completely outside the `while` loop, allowing V8 to optimize the inner loop cleanly without setting up local exception boundaries on every frame.

In the fast-path single worker mode (`poolLen === 1`), the `try/catch` is already hoisted outside the `for` loop, proving the architectural validity of this approach.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/tests/benchmarks/dom-heavy`
- **Render Settings**: 1920x1080, 60 FPS, 300 frames, libx264
- **Mode**: `dom` (with multi-worker concurrency, e.g., concurrency > 1, though it also runs on concurrency 1 to ensure standard execution is stable).
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~14.582s (from baseline median)
- **Bottleneck analysis**: JIT compilation complexity and AST traversal overhead caused by repeated `try/catch` boundaries inside an async hot loop.

## Implementation Spec

### Step 1: Hoist `try/catch` outside the `while` loop in `runWorker`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the `runWorker` function inside the `run()` multi-worker path. Change the structure.

## Results Summary
- **Best render time**: 14.464s (vs baseline 14.582s)
- **Improvement**: ~0.8% (within noise margin, discarded)
- **Kept experiments**: []
- **Discarded experiments**: [hoist-try-catch-in-runworker]
