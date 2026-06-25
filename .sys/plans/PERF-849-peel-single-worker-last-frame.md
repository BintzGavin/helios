---
id: PERF-849
slug: peel-single-worker-last-frame
status: complete
claimed_by: "claim-PERF-849"
created: 2024-06-25
completed: "2026-06-25"
result: "discarded"
---

# PERF-849: Peel Last Frame Iteration in Single-Worker CaptureLoop Fast Paths

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` fast paths (single worker loop).

## Background Research
Currently, the single-worker path contains a main frame capture loop that runs for `totalFrames - 1` iterations. Inside this loop, there is a conditional branch to handle the last frame differently.
This branching adds per-iteration overhead. By peeling the final iteration out of the loop entirely, we can remove the `if (i < totalFrames - 1)` branch and make the main loop branchless (aside from `aborted`), which should improve execution speed.

## Benchmark Configuration
- **Composition URL**: A standard DOM benchmark composition (e.g. 600x600 30fps dom mode script)
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.831s
- **Bottleneck analysis**: CPU time spent evaluating branches inside the single-worker fast path frame loop.

## Implementation Spec

### Step 1: Peel the Last Iteration Out of the `for` Loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker capture path block (spanning approx lines 260 to 800), locate the 8 instances of:
```typescript
for (let i = 1; i < totalFrames; i++) {
  if (aborted) break;

  if (i < totalFrames - 1) {
     // ... normal frame logic ...
  } else {
     // ... last frame logic ...
  }
}
```

Refactor each to:
```typescript
const lastFrameIdx = totalFrames - 1;
for (let i = 1; i < lastFrameIdx; i++) {
  if (aborted) break;
  // ... normal frame logic (the 'if' branch contents) ...
}

if (!aborted && lastFrameIdx >= 1) {
  const i = lastFrameIdx;
  // ... last frame logic (the 'else' branch contents) ...
}
```

**Why**: This entirely eliminates the `if (i < totalFrames - 1)` branch from the hot loop.
**Risk**: Breaking loop progress reporting or causing off-by-one errors on the last frame if the peeled block uses incorrect variables.

## Variations
None.

## Canvas Smoke Test
Ensure Canvas logic does not break.

## Correctness Check
Verify frames output length is correct and progress logs successfully.
