---
id: PERF-690
slug: bypass-time-step-multiplication
status: unclaimed
claimed_by: ""
created: 2024-06-07
completed: ""
result: ""
---

# PERF-690: Bypass timeStep Multiplication in Fast Path

## Focus Area
Single-worker fast path inside `CaptureLoop.ts`. Specifically targeting the dynamic arithmetic evaluation of `time` and `compositionTimeInSeconds` in the hot loop.

## Background Research
Currently, the hot loop computes the elapsed time on every iteration:
```typescript
const time = i * timeStep;
const compositionTimeInSeconds = (startFrame + i) * compTimeStep;
```
While floating-point multiplication is very fast in V8, doing it inside a synchronous microtask loop 30-60 times a second creates minor cumulative overhead and register shifting. If we convert this to simple addition of constants (`currentTime += timeStep`), we eliminate the multiplication dependency on `i`. V8 can aggressively optimize simple scalar addition on numbers that don't transition between SMI and HeapNumber representations. We just need to pre-calculate the starting base times.

## Benchmark Configuration
- **Composition URL**: http://localhost:3000/dom-benchmark.html
- **Render Settings**: 1080p, 60fps, 10s (600 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.18s
- **Bottleneck analysis**: Micro-optimizing floating point arithmetic overhead in V8 hot loop execution.

## Implementation Spec

### Step 1: Pre-calculate and add
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `poolLen === 1` single-worker branch, initialize time accumulators before the `for` loop:
```typescript
<<<<<<< SEARCH
        try {
            for (let i = 0; i < totalFrames; i++) {
                if (capturedErrors.length > 0 || (signal && signal.aborted)) break;

                const time = i * timeStep;
                const compositionTimeInSeconds = (startFrame + i) * compTimeStep;
=======
        let currentTime = 0;
        let compositionTimeInSeconds = startFrame * compTimeStep;

        try {
            for (let i = 0; i < totalFrames; i++) {
                if (capturedErrors.length > 0 || (signal && signal.aborted)) break;

                const time = currentTime;
>>>>>>> REPLACE
```
And at the end of the loop iteration (or immediately after assignment), increment the accumulators:
```typescript
<<<<<<< SEARCH
                if (!canWriteMore) {
                    previousWritePromise = new Promise<void>(this.drainPromiseExecutor);
                }
            } else {
                console.warn('FFmpeg stdin is not writable. Skipping write.');
            }
        }
=======
                if (!canWriteMore) {
                    previousWritePromise = new Promise<void>(this.drainPromiseExecutor);
                }
            } else {
                console.warn('FFmpeg stdin is not writable. Skipping write.');
            }

            currentTime += timeStep;
            compositionTimeInSeconds += compTimeStep;
        }
>>>>>>> REPLACE
```
**Why**: Avoids dynamic multiplication and reduces register allocation inside the loop block.
**Risk**: Floating point precision drift over thousands of frames. However, for a standard 60fps video, JS numbers (Double Precision IEEE 754) can handle sequential addition without catastrophic precision loss for millions of iterations, and we are only doing this for `timeDriver.setTime` which usually truncates or floors. If tests fail, it is easy to revert.

## Canvas Smoke Test
Run `npm run build -w packages/renderer` to ensure no syntax errors.

## Correctness Check
Run the DOM benchmark (`npx tsx scripts/benchmark-perf.ts`) and ensure output videos render correctly.

## Prior Art
- PERF-683: Introduced the single-worker fast path.
- General V8 optimization knowledge: simple addition is computationally cheaper than loop-dependent multiplication.
