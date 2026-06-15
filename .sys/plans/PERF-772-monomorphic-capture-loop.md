---
id: PERF-772
slug: monomorphic-capture-loop
status: unclaimed
claimed_by: ""
created: 2024-06-15
completed: ""
result: ""
---

# PERF-772: Monomorphic Capture Loop via Loop Peeling

## Focus Area
`CaptureLoop.ts` fast path (single worker) and multi-worker path.

## Background Research
Currently, the single-worker hot loop in `CaptureLoop.ts` evaluates the ternary `hasProcessFn ? strategy.processCaptureResult!(await strategy.capture(...)) : await strategy.capture(...)` on every single frame.
Although `hasProcessFn` is evaluated outside the loop, V8 must still evaluate the boolean branch and execute the ternary conditionally for every frame.
In PERF-767, an attempt was made to "Inline Capture Ternary", which improved performance to ~2.388s, but the branch was not fully peeled. By peeling the `hasProcessFn` check entirely to the outside of the `for` loop, we can provide V8 with two completely monomorphic, branchless loops. This simplifies the AST representation inside the hot loop, reducing JIT deoptimization risks and entirely bypassing the ternary evaluation.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 150 frames, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.069s
- **Bottleneck analysis**: Ternary branch evaluation inside the inner hot loop.

## Implementation Spec

### Step 1: Peel the `hasProcessFn` check in `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the `try` block for the single worker path (around line 147), split the single `for` loop into two separate `for` loops wrapped by `if (hasProcessFn)` and `else`.

Change from:
```typescript
        try {
            for (let i = 0; i < totalFrames; i++) {
                // ... setup
                const buffer = hasProcessFn ? strategy.processCaptureResult!(await strategy.capture(page, time)) : await strategy.capture(page, time);
                // ... write
            }
        }
```

To:
```typescript
        try {
            if (hasProcessFn) {
                for (let i = 0; i < totalFrames; i++) {
                    if (capturedErrors.length > 0 || (signal && signal.aborted)) break;

                    const time = i * timeStep;
                    const compositionTimeInSeconds = (startFrame + i) * compTimeStep;

                    await timeDriver.setTime(page, compositionTimeInSeconds);
                    const buffer = strategy.processCaptureResult!(await strategy.capture(page, time));

                    if (i === nextProgressFrame) {
                        console.log(`Progress: Rendered ${i} / ${totalFrames} frames`);
                        nextProgressFrame += progressInterval;
                    }

                    if (onProgress) {
                        onProgress(i / totalFrames);
                    }

                    if (stdin?.writable) {
                        const canWriteMore = stdin.write(buffer as any);

                        if (!canWriteMore && stdin.writableLength >= 16777216) {
                            await this.drainPromise;
                        }
                    } else {
                        console.warn('FFmpeg stdin is not writable. Skipping write.');
                    }
                }
            } else {
                for (let i = 0; i < totalFrames; i++) {
                    if (capturedErrors.length > 0 || (signal && signal.aborted)) break;

                    const time = i * timeStep;
                    const compositionTimeInSeconds = (startFrame + i) * compTimeStep;

                    await timeDriver.setTime(page, compositionTimeInSeconds);
                    const buffer = await strategy.capture(page, time);

                    if (i === nextProgressFrame) {
                        console.log(`Progress: Rendered ${i} / ${totalFrames} frames`);
                        nextProgressFrame += progressInterval;
                    }

                    if (onProgress) {
                        onProgress(i / totalFrames);
                    }

                    if (stdin?.writable) {
                        const canWriteMore = stdin.write(buffer as any);

                        if (!canWriteMore && stdin.writableLength >= 16777216) {
                            await this.drainPromise;
                        }
                    } else {
                        console.warn('FFmpeg stdin is not writable. Skipping write.');
                    }
                }
            }
        }
```

**Why**: This provides V8 with two completely flat, monomorphic loops, removing the conditional branch overhead from the innermost, hottest path of the renderer.

## Variations
Apply the exact same peeling logic to `runWorker` for the multi-worker path (around line 248), splitting its `while (!aborted)` loop into two separate loops based on `if (hasProcessFn)`.

## Canvas Smoke Test
Run `npm run test:canvas -w packages/renderer` or equivalent to ensure `CanvasStrategy` (which may or may not use `processCaptureResult`) still functions.

## Correctness Check
Run the DOM render benchmark script (`cd packages/renderer && npx tsx scripts/benchmark-perf.ts`) to ensure it produces valid outputs without regressions.
