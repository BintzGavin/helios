---
id: PERF-848
slug: remove-redundant-single-worker-aborted-checks
status: discarded
claimed_by: "jules"
created: 2024-06-25
completed: ""
result: ""
---

# PERF-848: Hoist Redundant `aborted` Branch Checks in Single-Worker CaptureLoop Fast Paths

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` fast paths (single worker loop).

## Background Research
In PERF-838 and PERF-839, we successfully hoisted the redundant `aborted` boolean checks in the multi-worker capture loops, yielding a significant improvement in V8 hot loop optimization. Note: this plan targets a similar logic optimization as the unclaimed plan PERF-846 but replaces it as the definitive version to execute.

Currently, the single-worker path still retains redundant `aborted` checks at multiple levels in the loops.
Example (around line 273):
```typescript
for (let i = 1; i < totalFrames; i++) {
  if (aborted) break;

  if (i < totalFrames - 1) {
    if (aborted) break;
    // ...
  } else {
    // ...
  }
}
```
The second `if (aborted) break;` immediately follows the first with no `await` in between. These redundant synchronous checks add zero value and force the JS engine to evaluate a branch unnecessarily on every frame, degrading performance. We can safely remove the inner `if (aborted) break;` since `aborted` cannot mutate without yielding execution. Additionally, we can rely solely on the loop condition `!aborted` where appropriate.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Implementation Spec

### Step 1: Remove redundant `if (aborted) break;` in Single-Worker Fast Path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker capture path (spanning from approx lines 260 to 800), there are nested `if (aborted) break;` checks inside the `for` loops.

Example of what to remove:
```typescript
for (let i = 1; i < totalFrames; i++) {
  if (aborted) break;

  if (i < totalFrames - 1) {
    if (aborted) break; // <--- REMOVE THIS
    const rawResult = await nextCapturePromise;
    // ...
  } else {
    const rawResult = await nextCapturePromise;
    // ...
  }
}
```

You must systematically trace through all `for (let i = 1; i < totalFrames; i++)` loops inside the single-worker block and remove the redundant inner `if (aborted) break;` statements. Leave only the initial `if (aborted) break;` at the top of the `for` loop.

There are exactly 8 such inner checks that need to be removed.
These occur exactly at lines 276, 353, 427, 482, 598, 668, 743, and 787.

## Variations
None.

## Canvas Smoke Test
Run `npx vitest run --passWithNoTests packages/renderer/` to ensure syntax is valid.

## Correctness Check
Run the `dom` mode benchmark script to verify progress logs correctly emit and render finishes without regressions.
