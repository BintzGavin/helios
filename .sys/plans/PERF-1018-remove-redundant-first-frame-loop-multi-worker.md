---
id: PERF-1018
slug: remove-redundant-first-frame-loop-multi-worker
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1018: Remove redundant first-frame write loop in multi-worker path

## Focus Area
The multi-worker frame writer logic in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
Currently, inside the multi-worker paths, there is a `while (!aborted) { ... break; }` loop that writes the very first frame before handing off to the main `while (nextFrameToWrite < totalFrames && !aborted) { ... }` chunked writer loop. This initial loop contains an exact duplicate of the worker dispatch and buffer stream write logic, taking up ~65 lines of code.

This duplicated block is entirely redundant because the subsequent `while (nextFrameToWrite < totalFrames && !aborted)` loop immediately takes over and is completely capable of writing the first frame. By removing the initial single-frame write loop, we drastically shrink the AST size of `CaptureLoop.ts` and reduce the amount of code V8 has to parse and JIT compile, which improves script evaluation time and potentially inlining heuristics.

## Benchmark Configuration
- **Composition URL**: Standard DOM and Canvas multi-worker benchmarks
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `dom` and `canvas` (multi-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The redundant `while (!aborted)` block before the main chunk writer loop adds ~65 lines of duplicate logic (buffer ring wait, stream write, worker dispatch array populating) to the parser and compiler burden without providing any functional benefit.

## Implementation Spec

### Step 1: Remove the first-frame write loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker path, locate the following structure (around line 721):

```typescript
      try {
        let nextProgress = progressInterval;
        if (nextFrameToWrite < totalFrames && !aborted) {
          while (!aborted) {
            // ... duplicated logic ...
            break;
          }

          if (!aborted) {
            while (nextFrameToWrite < totalFrames && !aborted) {
              const chunkEnd = Math.min(nextFrameToWrite + progressInterval, totalFrames);
```

Remove the entire `while (!aborted) { ... break; }` block, as well as the wrapping `if (!aborted) {` check for the main loop. The final code should look like this:

```typescript
      try {
        let nextProgress = progressInterval;
        if (nextFrameToWrite < totalFrames && !aborted) {
          while (nextFrameToWrite < totalFrames && !aborted) {
            const chunkEnd = Math.min(nextFrameToWrite + progressInterval, totalFrames);

            if (freeWorkersHead > 0) {
```

**Why**: Removes redundant duplicate code that merely processes a single frame before deferring to the chunk loop anyway. This reduces AST size and improves V8 JIT behavior for identical mathematical correctness.

## Canvas Smoke Test
Run `npx vitest -t "verify-canvas-strategy"` to ensure the Canvas strategy path works.

## Correctness Check
Run `npx vitest -t "verify-dom-strategy-capture"` to ensure the DOM path is still functioning correctly. Run `npm run test -w packages/renderer` to ensure nothing is broken.
