---
id: PERF-838
slug: hoist-aborted-checks
status: unclaimed
claimed_by: ""
created: 2024-06-24
completed: ""
result: ""
---

# PERF-838: Hoist Redundant `aborted` Branch Checks in CaptureLoop Fast Paths

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` fast paths (single and multi worker loops).

## Background Research
In the innermost hot loops of the `CaptureLoop.ts` multi-worker string/buffer writing paths, the boolean `aborted` is checked multiple times per iteration:
```typescript
while (nextFrameToWrite < endFrame) {
    if (aborted) break; // Check 1

    const ringIndex = nextFrameToWrite & ringMask;
    while (frameReadyRing[ringIndex] === 0 && !aborted) { // Check 2
        await writerWaiterPromise;
        if (freeWorkersHead > 0 || capturedErrors.length > 0 || (signal && signal.aborted)) {
            checkState();
        }
    }
    if (aborted) break; // Check 3

    // Write buffer...
}
```
The `aborted` flag is only flipped in extremely rare edge cases (errors or manual job abortion). Checking it up to three times per frame introduces unnecessary branch prediction overhead in the pipeline's most critical fast path.

By hoisting these checks (e.g. relying only on the `while` loop condition check if we yield execution, and checking immediately after an `await` which is the only point where `aborted` could asynchronously change), we can eliminate thousands of redundant boolean evaluations per second.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Implementation Spec

### Step 1: Hoist `aborted` checks in multi worker write loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker path (starting around line 980 for `isString === true` and line 1030 for the buffer path), simplify the loop from checking `aborted` three times per iteration to only checking it when necessary.

Since `aborted` can only mutate when the event loop is yielded (e.g. during `await writerWaiterPromise`), the synchronous checks at the top of the loop are strictly redundant if no `await` occurred previously in that iteration.

Change this:
```typescript
while (nextFrameToWrite < endFrame) {
    if (aborted) break;

    const ringIndex = nextFrameToWrite & ringMask;
    while (frameReadyRing[ringIndex] === 0 && !aborted) {
        await writerWaiterPromise;
        if (freeWorkersHead > 0 || capturedErrors.length > 0 || (signal && signal.aborted)) {
            checkState();
        }
    }
    if (aborted) break;
    // ... write buffer ...
}
```
To this:
```typescript
while (nextFrameToWrite < endFrame) {
    const ringIndex = nextFrameToWrite & ringMask;

    if (frameReadyRing[ringIndex] === 0) {
        while (frameReadyRing[ringIndex] === 0 && !aborted) {
            await writerWaiterPromise;
            if (freeWorkersHead > 0 || capturedErrors.length > 0 || (signal && signal.aborted)) {
                checkState();
            }
        }
        if (aborted) break;
    }

    // ... write buffer ...
}
```
This fast-paths the case where `frameReadyRing[ringIndex] !== 0` (the frame is already buffered and ready), bypassing the `aborted` checks entirely since no asynchronous execution occurred.

## Canvas Smoke Test
Run `node -e "/* quick canvas render to verify no breakage */"`

## Correctness Check
Run the `dom` mode benchmark script to verify progress logs correctly emit and render finishes without regressions or hanging on abort.
