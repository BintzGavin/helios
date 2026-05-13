---
id: PERF-498
slug: restore-ffmpeg-backpressure
status: complete
claimed_by: "executor-session"
created: 2026-05-13
completed: "2026-05-13"
result: "keep"
---

# PERF-498: Restore FFmpeg Backpressure in CaptureLoop

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - `run` method, specifically restoring the FFmpeg `stdin.write` backpressure logic.

## Background Research
`PERF-485` tested removing `stdin` backpressure. It was deemed a failure (discarded) due to excessive GC pressure from unbound buffering. However, the `await previousWritePromise` code was never actually restored in the codebase, causing a silent regression. Node.js buffers incoming frames unboundedly, which negates theoretical gains and causes high memory usage for long renders. Restoring the backpressure properly syncs the orchestrator with FFmpeg.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: Same as baseline
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~4.169s
- **Bottleneck analysis**: Unbound buffering and GC pauses due to missing backpressure.

## Implementation Spec

### Step 1: Restore backpressure `await` in CaptureLoop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `run` method's main `while` loop, restore the `previousWritePromise` backpressure await.

```typescript
<<<<<<< SEARCH
            if (onProgress) {
                onProgress(currentFrame / this.totalFrames);
            }

            this.writeToStdin(buffer, this.handleWriteError);

            nextFrameToWrite++;
=======
            if (onProgress) {
                onProgress(currentFrame / this.totalFrames);
            }

            if (previousWritePromise) {
                await previousWritePromise;
            }

            const writeResult = this.writeToStdin(buffer, this.handleWriteError);
            previousWritePromise = writeResult ? writeResult : undefined;

            nextFrameToWrite++;
>>>>>>> REPLACE
```

### Step 2: Restore final backpressure flush
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Before finishing the strategy, await any remaining `previousWritePromise`.

```typescript
<<<<<<< SEARCH
    await Promise.all(workerPromises);

    console.log('Finishing render strategy...');
=======
    await Promise.all(workerPromises);

    if (previousWritePromise) {
        await previousWritePromise;
    }

    console.log('Finishing render strategy...');
>>>>>>> REPLACE
```

**Why**: Re-enabling backpressure allows Node.js to wait for FFmpeg to drain before advancing `nextFrameToWrite`, significantly reducing memory/GC overhead.
**Risk**: None. This is restoring known-good, intended behavior.

## Variations
- None.

## Canvas Smoke Test
Run a standard Canvas mode benchmark to ensure no regressions.

## Correctness Check
Run the standard DOM benchmark to ensure FFmpeg successfully encodes all frames from the buffered pipe.

## Results Summary
- **Best render time**: 17.687s (vs baseline 18.267s)
- **Improvement**: 3.1%
- **Kept experiments**: PERF-498
- **Discarded experiments**: none
