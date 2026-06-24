---
id: PERF-833
slug: unswitch-is-dom-strategy
status: unclaimed
claimed_by: ""
created: 2024-06-24
completed: ""
result: ""
---

# PERF-833: Unswitch isDomStrategy conditional in CaptureLoop

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` fast paths (both single and multi-worker loops).

## Background Research
In previous experiments (PERF-820), we successfully unswitched the `isString` conditional check by processing the first frame and then splitting the execution into dedicated loops for strings and raw buffers. This eliminated per-iteration branch evaluation for the buffer type.

Similarly, we still have an `if (isDomStrategy)` check evaluated on *every* single iteration of the innermost capture loops:

```typescript
if (isDomStrategy) {
    nextCapturePromise = domBeginFrame!();
} else {
    nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
}

// ... later in loop ...

let buf;
if (isDomStrategy) {
    const data = rawResult.screenshotData;
    if (data) {
        domLastFrameData = data;
    }
    buf = domLastFrameData as string;
} else {
    buf = strategy.processCaptureResult!(rawResult) as string;
}
```

Since the `strategy` is fixed for the duration of the entire `CaptureLoop`, `isDomStrategy` never changes. We are constantly paying the cost of evaluating this branch inside the hottest inner loops.

By fully unswitching this branch (creating dedicated loops for DOM vs Canvas strategies), we can further strip down the hot loop instructions and eliminate branch prediction overhead entirely for the capture and result processing steps.

This unswitching should be applied inside the existing `isString` branch structure, resulting in highly specialized and minimal inner loops.

## Implementation Spec

### Step 1: Unswitch isDomStrategy in Single-Worker String Path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker path, where we have `if (isString)`, further split the logic into `if (isDomStrategy)` and `else` (canvas strategy) before the main loops.

```typescript
if (isString) {
    if (isDomStrategy) {
        for (let i = 1; i < totalFrames; i++) {
            if (aborted) break;
            const rawResult = await nextCapturePromise;

            const timePromise = timeDriver.setTime(page, (startFrame + i + 1) * compTimeStep);
            if (timePromise) await timePromise;
            nextCapturePromise = domBeginFrame!();

            const data = rawResult.screenshotData;
            if (data) {
                domLastFrameData = data;
            }
            const buf = domLastFrameData as string;

            // [base64 write logic]

            // [progress logic]
        }
    } else {
        for (let i = 1; i < totalFrames; i++) {
            if (aborted) break;
            const rawResult = await nextCapturePromise;

            const timePromise = timeDriver.setTime(page, (startFrame + i + 1) * compTimeStep);
            if (timePromise) await timePromise;
            nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);

            const buf = strategy.processCaptureResult!(rawResult) as string;

            // [base64 write logic]

            // [progress logic]
        }
    }
}
```
**Why**: Removes branch evaluation per frame.

### Step 2: Unswitch isDomStrategy in Single-Worker Buffer Path
**What to change**:
Apply the same `if (isDomStrategy) { ... loop ... } else { ... loop ... }` unswitching to the `else` block (when `isString` is false, meaning it's a raw buffer) in the single worker path.
*Note: DOM strategy usually returns strings (base64), but maintaining structural symmetry is safer.*

### Step 3: Unswitch isDomStrategy in Multi-Worker Paths
**What to change**:
Apply the same logic to the multi-worker loop (`const runWorker = async (worker, workerId) => { ... }`).
Find the `if (isString)` and `else` blocks containing the `while (!aborted)` or `for` loops, and wrap them in an outer `if (isDomStrategy)` conditional, specializing the inner loop bodies to remove the `isDomStrategy` ternary/if-checks.

## Canvas Smoke Test
Run `npx vitest run --passWithNoTests packages/renderer/` and run the performance benchmark with `--mode canvas`.

## Correctness Check
Run the DOM benchmark to verify output is identical.
