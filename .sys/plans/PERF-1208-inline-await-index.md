---
id: PERF-1208
slug: inline-await-index
status: unclaimed
claimed_by: ""
created: 2026-11-10
completed: ""
result: ""
---
# PERF-1208: Inline awaitIndex in multi-worker writer block

## Focus Area
The multi-worker loop in `CaptureLoop.ts` defines an intermediate `awaitIndex` variable before querying `frameBufferRing` when waiting for writers.

## Background Research
Currently in the multi-worker loop, the writer polling logic looks like this:
```typescript
            if (nextFrameToWrite !== chunkEnd) {
              const awaitIndex = nextFrameToWrite & ringMask;
              while (frameBufferRing[awaitIndex] === null && !aborted) {
                await writerWaiterPromise;
              }
              if (aborted) break;
            }
```
By inlining `nextFrameToWrite & ringMask` directly into the `frameBufferRing` lookup, we can eliminate the intermediate variable `awaitIndex`, reducing AST parsing complexity and slightly optimizing the wait loop closure in V8.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-canvas-animation/composition.html`
- **Render Settings**: 1080p, 60fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The intermediate variable assignment `const awaitIndex` inside the hot chunk processing loop contributes to AST parser overhead.

## Implementation Spec

### Step 1: Inline `awaitIndex` calculation in `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker chunk processing loop (around line 550), change:
```typescript
            if (nextFrameToWrite !== chunkEnd) {
              const awaitIndex = nextFrameToWrite & ringMask;
              while (frameBufferRing[awaitIndex] === null && !aborted) {
                await writerWaiterPromise;
              }
              if (aborted) break;
            }
```
to:
```typescript
            if (nextFrameToWrite !== chunkEnd) {
              while (frameBufferRing[nextFrameToWrite & ringMask] === null && !aborted) {
                await writerWaiterPromise;
              }
              if (aborted) break;
            }
```
**Why**: This reduces the number of variables and assignments within the multi-worker chunk writer loop, simplifying V8 AST parsing and execution.

## Correctness Check
Run the standard renderer benchmark verifying that the DOM mode renders correctly without errors and verify the output using `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=dom --url=file:///app/examples/simple-canvas-animation/composition.html`.
