---
id: PERF-1212
slug: remove-redundant-bounds-check
status: complete
claimed_by: "executor-session"
created: 2024-05-24
completed: "2026-11-11"
result: "failed"
---

# PERF-1212: Remove redundant nextFrameToWrite < totalFrames check in CaptureLoop.ts

## Focus Area
The multi-worker loop in `CaptureLoop.ts` has a redundant outer `if` condition checking `nextFrameToWrite < totalFrames`. We can remove this as the `while` loop immediately inside already checks this condition, which reduces AST overhead and AST complexity.

## Background Research
When compiling JS code, V8 parses and evaluates branching logic. Extraneous `if` conditions around `while` loops that check the exact same bounds simply bloat the AST and generate duplicate evaluations of the condition upon entry. By removing the wrapping `if (nextFrameToWrite < totalFrames && !aborted)`, we reduce branching evaluation on loop initialization, and simplify AST parsing.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-dom-animation/composition.html`
- **Render Settings**: 1280x720, 60fps, 5s (300 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~6.29s (PERF-1207)
- **Bottleneck analysis**: Micro-optimizations to V8 fast paths add up. Reducing AST size and redundant evaluations in hot chunking paths helps the JS engine compile and execute faster.

## Implementation Spec

### Step 1: Remove redundant bounds check
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Remove the `if (nextFrameToWrite < totalFrames && !aborted) {` block wrapping the `while` loop starting at line 504.
Specifically, change:
```typescript
        let progressCounter = progressInterval;
        if (nextFrameToWrite < totalFrames && !aborted) {
          while (nextFrameToWrite !== totalFrames && !aborted) {
             // ...
          }
        }
```
to:
```typescript
        let progressCounter = progressInterval;
        while (nextFrameToWrite !== totalFrames && !aborted) {
           // ...
        }
```
And adjust indentation accordingly.

**Why**: The condition is entirely redundant since the `while` loop checks if `nextFrameToWrite !== totalFrames && !aborted`, and `nextFrameToWrite` starts at 0. This removes an unneeded AST branch point and scope wrapper.
**Risk**: None. The condition bounds are correctly checked by the `while` loop.

## Correctness Check
- Render output from DOM composition matches previous commits.
- Canvas render pipeline is unaffected.

## Canvas Smoke Test
Run benchmark with canvas mode to ensure it doesn't break.

## Results Summary
- **Best render time**: 0.000s (vs baseline 8.690s)
- **Improvement**: 0%
- **Kept experiments**:
- **Discarded experiments**: Removed redundant bounds check (failed tests)
