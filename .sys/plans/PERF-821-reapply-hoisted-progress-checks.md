---
id: PERF-821
slug: reapply-hoisted-progress-checks
status: complete
claimed_by: ""
created: 2024-06-22
completed: "2024-06-22"
result: "keep"
---

# PERF-821: Reapply Hoisted Progress Checks to Unswitched Loops

## Focus Area
`CaptureLoop.ts` single-worker fast path.

## Background Research
PERF-794 successfully optimized the hot loops by evaluating progress checks in chunked bounds instead of conditionally evaluating `if (i === nextProgressFrame)` on every frame inside the inner loop.
However, PERF-820 subsequently refactored the fast path by unswitching the `isString` condition to separate the loops entirely. In doing so, it reverted the inner loops to evaluating `if (i === nextProgressFrame)` on every frame.
By merging these two optimizations—re-applying the chunked loop structure from PERF-794 into the newly unswitched loops from PERF-820—we should be able to eliminate the branch prediction overhead of the progress checks while keeping the monomorphic String vs Buffer loops intact.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.83s
- **Bottleneck analysis**: The `if (i === nextProgressFrame)` and `if (onProgress)` conditionals are evaluated on every frame inside the hottest loop, adding unnecessary branching overhead.

## Implementation Spec

### Step 1: Chunked Loop in Single Worker `hasProcessFn` String Path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the single-worker path where `if (isString)` executes the string loop for `hasProcessFn`, refactor from a single `for` loop to a chunked loop:
```typescript
if (isString) {
    let currentFrame = 1;
    while (currentFrame < totalFrames) {
        if (aborted) break;
        const endFrame = Math.min(currentFrame + progressInterval, totalFrames);

        for (let i = currentFrame; i < endFrame; i++) {
            if (aborted) break;
            const rawResult = await nextCapturePromise;

            if (i + 1 < totalFrames) {
                const timePromise = timeDriver.setTime(page, (startFrame + i + 1) * compTimeStep);
                if (timePromise) await timePromise;
                nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
            }

            const buf = strategy.processCaptureResult!(rawResult) as string;

            const maxBytes = (buf.length * 3) >>> 2;
            let pooled = freePool.pop();
            if (!pooled || pooled.buffer.length < maxBytes) {
                pooled = new PooledBuffer(maxBytes + (maxBytes >> 1), freePool);
            }
            const written = pooled.buffer.write(buf, 'base64');
            const chunk = pooled.buffer.subarray(0, written);
            const writeSuccessStr = stream.write(chunk, pooled.freeCb);

            if (!writeSuccessStr && stream.writableLength >= 16777216) {
                await this.drainPromise;
            }
        }

        currentFrame = endFrame;
        console.log(`Progress: Rendered ${currentFrame - 1} / ${totalFrames} frames`);
        if (onProgress) {
            onProgress((currentFrame - 1) / totalFrames);
        }
    }
}
```

### Step 2: Chunked Loop in Single Worker `hasProcessFn` Buffer Path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Apply the same chunking structure to the `else` (Buffer) branch of the `hasProcessFn` path.

### Step 3: Chunked Loops in Single Worker `!hasProcessFn` Path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Apply the chunking structure to both the `isString` and Buffer paths in the `!hasProcessFn` block.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx scripts/benchmark-perf.ts --mode canvas` to ensure `canvas` mode is not broken.

## Correctness Check
Run the `dom` mode benchmark script to verify progress logs correctly emit in chunks and render finishes without regressions.

## Prior Art
- PERF-794: Successfully hoisted progress checks.
- PERF-820: Successfully unswitched `isString` check.
