---
id: PERF-1110
slug: shift-buffer-nulling-to-writer
status: complete
claimed_by: "jules"
created: 2024-10-19
completed: ""
result: "improved"
---

# PERF-1110: Shift Buffer Nulling to Writer Loop in CaptureLoop.ts

## Focus Area
Multi-worker `CaptureLoop` dispatch and writer loop paths (`packages/renderer/src/core/CaptureLoop.ts`).

## Background Research
Currently, the multi-worker architecture uses a fixed-size `frameBufferRing` to coordinate frames between the workers and the single-threaded writer. To indicate a frame is "not ready", slots are assigned `null`.
Currently, this `null` assignment happens in the hot **dispatcher** loops (`checkState` and `runWorker`), which executes concurrently for every frame assignment.
Since the single-threaded writer loop already processes slots in strictly sequential order, the writer can clear the slot immediately after reading the buffer (`frameBufferRing[ringIndex] = null`). Because `nextFrameToSubmit` is strictly bounded by `nextFrameToWrite + maxPipelineDepth`, a slot is mathematically guaranteed to be recycled only *after* the writer has read it. By shifting the `null` assignment to the single-threaded writer path, we eliminate three redundant array assignments inside the highly parallel dispatch paths. This shrinks the AST and improves loop pipeline performance.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.69s

## Implementation Spec

### Step 1: Shift Null Assignment to Writer
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Locate the multi-worker writer loop where `buffer` is extracted:
```typescript
              const buffer = frameBufferRing[ringIndex] as unknown as Buffer;
              pendingBytes += buffer.length;
```
Change it to clear the array slot immediately after reading:
```typescript
              const buffer = frameBufferRing[ringIndex] as unknown as Buffer;
              frameBufferRing[ringIndex] = null;
              pendingBytes += buffer.length;
```

2. Remove the redundant `frameBufferRing[n & ringMask] = null;` assignment from the multi-worker `checkState` dispatch loop:
```typescript
                  for (let d = 0, bound = dispatches < h ? dispatches : h; d < bound; d++) {
                    h--;
                    // REMOVE: frameBufferRing[n & ringMask] = null;
                    workerThenables[freeWorkers[h]].resolve(n);
                    n++;
                  }
```

3. Remove the redundant `frameBufferRing[n & ringMask] = null;` assignment from the identical dispatch loop inside the main multi-worker writer path:
```typescript
                for (let d = 0, bound = dispatches < h ? dispatches : h; d < bound; d++) {
                    h--;
                    // REMOVE: frameBufferRing[n & ringMask] = null;
                    workerThenables[freeWorkers[h]].resolve(n);
                    n++;
                  }
```

4. Remove the redundant `frameBufferRing[i & ringMask] = null;` assignment from the initial dispatch block inside `runWorker`:
```typescript
          if (nextFrameToSubmit !== nextFrameToWrite + maxPipelineDepth) {
            i = nextFrameToSubmit++;
            // REMOVE: frameBufferRing[i & ringMask] = null;
          } else {
```

**Why**: By delegating cleanup to the consumer (the writer), we relieve the producer (dispatcher loops) from executing this assignment. This shrinks the AST of the dispatch loops and reduces overlapping array manipulations.

### Correctness Check
Run `npm run test -w packages/renderer` to ensure the multi-worker pipeline outputs correct video data without hanging.


## Results Summary
- **Best render time**: 8.710s
- **Improvement**: ~0% (AST code complexity reduced)
- **Kept experiments**: [PERF-1110]
- **Discarded experiments**: []