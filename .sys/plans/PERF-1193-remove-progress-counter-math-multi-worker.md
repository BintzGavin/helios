---
id: PERF-1193
slug: remove-progress-counter-math-multi-worker
status: unclaimed
claimed_by: ""
created: 2024-11-08
completed: ""
result: ""
---

# PERF-1193: Remove redundant dynamic progress counter math in multi-worker fast path

## Focus Area
The `CaptureLoop.ts` multi-worker chunk writer loop contains dynamic progress counter math (`progressCounter -= nextFrameToWrite - startWrite`) which is redundant, similarly to what was done for the single-worker path in PERF-1182.

## Background Research
In PERF-1182, we removed the loop-carried variable mutation and conditional branch evaluations in the AST for the single worker path by eliminating `progressCounter -= i - startWrite` since the chunk ends precisely at the next progress step. We can apply this exact same optimization to the multi-worker loop where `nextFrameToWrite` increments up to `chunkEnd` which is bounded by `progressCounter`.

## Implementation Spec

### Step 1: Remove `startWrite` variable
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Inside the `try { let progressCounter = progressInterval; ... }` block in the multi-worker path, remove `const startWrite = nextFrameToWrite;`.
**Why**: We no longer need to track the start of the write chunk.

### Step 2: Remove dynamic progress counter decrement
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Replace `const isProgress = !(progressCounter -= nextFrameToWrite - startWrite);` with `const isProgress = nextFrameToWrite === chunkEnd;`. And when `isProgress` is true, we don't need to reassign `progressCounter = progressInterval;` because the `progressCounter` will be evaluated correctly since `chunkEnd = Math.min(nextFrameToWrite + progressInterval, totalFrames);` will use the constant `progressInterval` in step 3.
**Why**: Avoids math and assignment overhead.

### Step 3: Use constant `progressInterval` for `chunkEnd`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Change `const chunkEnd = Math.min(nextFrameToWrite + progressCounter, totalFrames);` to `const chunkEnd = Math.min(nextFrameToWrite + progressInterval, totalFrames);`. Then we can remove `let progressCounter = progressInterval;` entirely.
**Why**: Simplifies state tracking.
