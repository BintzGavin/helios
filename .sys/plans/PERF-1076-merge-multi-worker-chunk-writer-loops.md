---
id: PERF-1076
slug: merge-multi-worker-chunk-writer-loops
status: unclaimed
claimed_by: ""
created: 2026-10-14
completed: ""
result: ""
---

# PERF-1076: Merge multi-worker chunk writer loops

## Focus Area
The multi-worker writer chunk output loops in `CaptureLoop.ts` (the duplicated `isDomStrategyWriter` check).

## Background Research
Currently in the `CaptureLoop.ts` file, the `try` block in `multiWorker()` splits into two identical branches based on `if (isDomStrategyWriter)` and `else`. The only differences between the two branches are TypeScript types/casts inside the inner wait/write loop (`as unknown as Buffer` vs `as any`).
At runtime, both `Buffer` and whatever object canvas returns to write support `buffer.length` or `(buffer as any).length` (which is identical JS at runtime).
Merging these two monolithic `if/else` blocks entirely removes ~60 lines of duplicated logic, cuts the parser overhead for the outer loop structure, and lets TurboFan compile a single hot loop block for stream writing. V8 will polymorphically inline the stream write path if the buffer types differ, which is standard for dynamically typed JS engines, but avoiding the top-level AST duplication is a strict win.

## Benchmark Configuration
- **Composition URL**: Standard DOM and Canvas benchmark compositions.
- **Render Settings**: Standard multi-worker settings.
- **Mode**: `dom` and `canvas`
- **Metric**: Execution speed in microbenchmarks / Wall-clock render time in seconds.
- **Minimum runs**: 3 per experiment, report median.

## Baseline
- **Bottleneck analysis**: Duplicated AST structure for the multi-worker writer loops based on `isDomStrategyWriter`. The engine must parse, compile, and manage two separate lexical environments and bytecode sequences that do the exact same thing at runtime.

## Implementation Spec

### Step 1: Remove `isDomStrategyWriter` outer conditional branch
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the `try` block in the multi-worker execution path:
```typescript
      try {
        let nextProgress = progressInterval;
        if (isDomStrategyWriter) {
          if (nextFrameToWrite < totalFrames && !aborted) {
            while (nextFrameToWrite !== totalFrames && !aborted) {
```
Replace the entire `if (isDomStrategyWriter) { ... } else { ... }` structure with just the inner content:
```typescript
      try {
        let nextProgress = progressInterval;
        if (nextFrameToWrite < totalFrames && !aborted) {
          while (nextFrameToWrite !== totalFrames && !aborted) {
            const chunkEnd = nextProgress < totalFrames ? nextProgress : totalFrames;

            if (freeWorkersHead !== 0) {
              const limit = nextFrameToWrite + maxPipelineDepth;
              let dispatches = (limit < totalFrames ? limit : totalFrames) - nextFrameToSubmit;
                let h = freeWorkersHead;
                let n = nextFrameToSubmit;
                if (dispatches > 0) {
                  dispatches = dispatches < h ? dispatches : h;
                  for (let d = 0; d < dispatches; d++) {
                    h--;
                    const w = freeWorkers[h];
                    frameBufferRing[n & ringMask] = null;
                    workerThenables[w].resolve(n);
                    n++;
                  }
                }
                if (n === totalFrames) {
                  while (h !== 0) {
                    h--;
                    const w = freeWorkers[h];
                    workerThenables[w].resolve(-1);
                  }
                  h = 0;
                }
                freeWorkersHead = h;
                nextFrameToSubmit = n;
            }

            while (nextFrameToWrite !== chunkEnd) {
              const ringIndex = nextFrameToWrite & ringMask;
              if (frameBufferRing[ringIndex] === null) {
                break;
              }

              const buffer = frameBufferRing[ringIndex] as any;
              pendingBytes += buffer.length;
              const writeSuccess = stream.write(buffer);

              if (!writeSuccess && pendingBytes >= 16777216) {
                await this.drainPromise;
                pendingBytes = 0;
              }

              nextFrameToWrite++;
            }

            if (aborted) break;
            if (nextFrameToWrite !== chunkEnd) {
              const awaitIndex = nextFrameToWrite & ringMask;
              if (frameBufferRing[awaitIndex] === null) {
                do {
                  await writerWaiterPromise;
                } while (frameBufferRing[awaitIndex] === null && !aborted);
                if (aborted) break;
              }
            }

            if (nextFrameToWrite === nextProgress) {
              nextProgress += progressInterval;
              console.log(
                `Progress: Rendered ${nextFrameToWrite} / ${totalFrames} frames`,
              );
              if (onProgress) onProgress(nextFrameToWrite / totalFrames);
            }
          }
        }
      } catch (e) {
```

**Why**: Code deduplication. Eliminating branch evaluation and reducing AST size speeds up initial parser and JIT compilation, and creates a single unified hot path for TurboFan to optimize.
**Risk**: If DOM and Canvas buffers behave significantly differently in the stream, they might deoptimize the call site. However, Node's internal stream write implementation is already polymorphic, so this impact is negligible compared to the AST duplication cost.

## Variations
None.

## Canvas Smoke Test
Run canvas composition test to ensure canvas buffers write successfully.

## Correctness Check
Run the `renderer` test suite to ensure multi-worker buffer loops still function.
