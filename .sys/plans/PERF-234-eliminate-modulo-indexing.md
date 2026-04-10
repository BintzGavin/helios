---
id: PERF-234
slug: eliminate-modulo-indexing
status: complete
claimed_by: "executor-session"
created: 2024-05-30
---
# PERF-234: Eliminate Modulo Indexing in CaptureLoop Ring Buffer

## Focus Area
In `CaptureLoop.ts`, the ring buffer for `framePromises` (introduced in PERF-233) uses modulo arithmetic (`% maxPipelineDepth`) in the hot loop. The modulo operator is slightly slower than bitwise operations. Since `maxPipelineDepth` is `poolLen * 2` (which is typically 8 when `poolLen` is 4), it's a power of 2. We can optimize the ring buffer indexing by using a bitwise AND mask instead of modulo.

## Background Research
Currently, `framePromises` is indexed using `[nextFrameToSubmit % maxPipelineDepth]` and `[nextFrameToWrite % maxPipelineDepth]`. If we enforce that `maxPipelineDepth` is a power of 2, we can compute a `pipelineMask = maxPipelineDepth - 1` and use bitwise AND (`& pipelineMask`) instead of modulo.
`poolLen` is derived from `this.pool.length`. If we pad `maxPipelineDepth` to the next power of 2, we can always use bitwise AND.
Wait, let's keep it simple: instead of modulo, just maintain two running indices `submitIndex` and `writeIndex` that increment and wrap around using an `if` check or just standard modulo if bitwise is too complex to enforce. Actually, `submitIndex = (submitIndex + 1) % maxPipelineDepth` is fine, but even better: just `submitIndex++; if (submitIndex === maxPipelineDepth) submitIndex = 0;`. This avoids modulo arithmetic entirely on the hot path for every frame, while being completely safe regardless of whether `maxPipelineDepth` is a power of 2.

Let's trace `nextFrameToSubmit` and `nextFrameToWrite`. They need to increment monotonically for the logic `nextFrameToSubmit < this.totalFrames` and `(nextFrameToSubmit - nextFrameToWrite) < maxPipelineDepth`. So we still need those monotonic counters.
But for array indexing, we can just use `nextFrameToSubmit % maxPipelineDepth`. Is `nextFrameToSubmit % maxPipelineDepth` slow enough to matter? Probably not much, but let's try a different optimization.

Wait, looking at `CaptureLoop.ts` again, the inner `while` loop has:
```typescript
const frameIndex = nextFrameToSubmit;
const worker = this.pool[frameIndex % poolLen];
```
We can maintain a `workerIndex` that wraps around:
```typescript
let workerIndex = nextFrameToSubmit % poolLen;
// inside loop:
const worker = this.pool[workerIndex];
workerIndex++;
if (workerIndex === poolLen) workerIndex = 0;
```
Similarly for `framePromises` index:
```typescript
let submitPromiseIndex = nextFrameToSubmit % maxPipelineDepth;
// inside loop:
framePromises[submitPromiseIndex] = framePromise;
submitPromiseIndex++;
if (submitPromiseIndex === maxPipelineDepth) submitPromiseIndex = 0;
```
And for `writeIndex`:
```typescript
let writePromiseIndex = nextFrameToWrite % maxPipelineDepth;
// inside loop:
const buffer = await framePromises[writePromiseIndex];
writePromiseIndex++;
if (writePromiseIndex === maxPipelineDepth) writePromiseIndex = 0;
```

Let's benchmark this.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark
- **Render Settings**: 1920x1080, 60 FPS, 10s duration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Repeated modulo arithmetic in the hot loops (`nextFrameToSubmit % poolLen`, `nextFrameToSubmit % maxPipelineDepth`, `nextFrameToWrite % maxPipelineDepth`) adds a small but non-zero CPU overhead per frame.

## Implementation Spec

### Step 1: Optimize indexing in CaptureLoop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `run()`, initialize cyclic indices before the loops:
```typescript
    let workerIndex = nextFrameToSubmit % poolLen;
    let submitPromiseIndex = nextFrameToSubmit % maxPipelineDepth;
    let writePromiseIndex = nextFrameToWrite % maxPipelineDepth;
```

Inside the inner `while (nextFrameToSubmit < this.totalFrames ...)` loop, replace:
```typescript
            const worker = this.pool[frameIndex % poolLen];
            // ...
            framePromises[nextFrameToSubmit % maxPipelineDepth] = framePromise;
            nextFrameToSubmit++;
```
With:
```typescript
            const worker = this.pool[workerIndex];
            // ...
            framePromises[submitPromiseIndex] = framePromise;
            nextFrameToSubmit++;
            workerIndex++;
            if (workerIndex === poolLen) workerIndex = 0;
            submitPromiseIndex++;
            if (submitPromiseIndex === maxPipelineDepth) submitPromiseIndex = 0;
```

And in the outer loop, replace:
```typescript
        const buffer = await framePromises[nextFrameToWrite % maxPipelineDepth]!;
```
With:
```typescript
        const buffer = await framePromises[writePromiseIndex]!;
        writePromiseIndex++;
        if (writePromiseIndex === maxPipelineDepth) writePromiseIndex = 0;
```

**Why**: Replaces modulo operators with simple increment and branch, which is typically much faster in tight CPU loops.
**Risk**: If indices fall out of sync with `nextFrameToSubmit`/`nextFrameToWrite`, frames might be sent to the wrong worker or read out of order.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-selector.ts` and verify output.

## Results Summary
- **Best render time**: 0.000s
- **Improvement**: N/A (Discarded)
- **Kept experiments**: []
- **Discarded experiments**: [PERF-234 eliminate modulo indexing]
