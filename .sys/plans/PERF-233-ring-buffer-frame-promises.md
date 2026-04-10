---
id: PERF-233
slug: ring-buffer-frame-promises
status: unclaimed
claimed_by: ""
created: 2024-05-30
completed: ""
result: ""
---
# PERF-233: Use Ring Buffer for Frame Promises in CaptureLoop

## Focus Area
The `CaptureLoop.ts` hot loop pre-allocates an array `framePromises` of size `this.totalFrames` and nullifies elements as they are processed. For long compositions, this creates a large array that gets slowly populated and emptied, generating V8 garbage collection overhead and memory pressure.

## Background Research
Currently, `CaptureLoop` initializes `let framePromises: Promise<Buffer | string>[] = new Array(this.totalFrames);` and uses `framePromises[nextFrameToSubmit] = framePromise`. Since pipeline depth is limited by `maxPipelineDepth` (`(nextFrameToSubmit - nextFrameToWrite) < maxPipelineDepth`), at most `maxPipelineDepth` (typically 8) promises are active at any time. By replacing this linear array with a ring buffer of size `maxPipelineDepth` and indexing via modulo (`% maxPipelineDepth`), we eliminate the large array allocation entirely and keep memory usage extremely small and bounded.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark
- **Render Settings**: 1920x1080, 60 FPS, 10s duration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Allocating and modifying a large `totalFrames` array creates unnecessary GC pressure compared to a bounded ring buffer of size `maxPipelineDepth`.

## Implementation Spec

### Step 1: Replace array allocation with bounded ring buffer
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `run()`, locate the initialization of `framePromises`:
```typescript
    let framePromises: Promise<Buffer | string>[] = new Array(this.totalFrames);
```
And the definition of `maxPipelineDepth`:
```typescript
    const maxPipelineDepth = poolLen * 2;
```
Move the initialization of `framePromises` to *after* `maxPipelineDepth` is defined, and size it to `maxPipelineDepth`:
```typescript
    const maxPipelineDepth = poolLen * 2;
    // ...
    let framePromises: Promise<Buffer | string>[] = new Array(maxPipelineDepth);
```

**Why**: Bound the array size to the maximum number of active frames, drastically reducing allocation overhead for long renders.
**Risk**: If `maxPipelineDepth` logic is altered to allow more active frames than the array size, it could overwrite unresolved promises.

### Step 2: Use modulo indexing for framePromises
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `while (nextFrameToWrite < this.totalFrames)` loop, change the assignments to use modulo.
For the inner `while` loop, change `framePromises[nextFrameToSubmit] = framePromise;` to:
```typescript
            framePromises[nextFrameToSubmit % maxPipelineDepth] = framePromise;
```
For reading the buffer, change `const buffer = await framePromises[nextFrameToWrite]!;` and the subsequent nullification `framePromises[nextFrameToWrite] = null as any;` to:
```typescript
        const buffer = await framePromises[nextFrameToWrite % maxPipelineDepth]!;
        // The nullification is no longer necessary as the index will be safely overwritten
```

**Why**: Implements the ring buffer logic, ensuring we only use the pre-allocated fixed-size array space.
**Risk**: None, since the `while` condition explicitly limits the difference between submit and write pointers to `maxPipelineDepth`.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-selector.ts` and verify output to ensure frames aren't dropped or duplicated due to index mismatch.
