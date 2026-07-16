---
id: PERF-1023
slug: isolate-dom-canvas-loops-single-worker
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1023: Isolate DOM and Canvas processing loops for single-worker in `CaptureLoop.ts`

## Focus Area
The single-worker fast rendering chunk loops (`hasProcessFn` and `!hasProcessFn`) in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
The single-worker execution paths (`hasProcessFn` true and false) both contain hot loops evaluating `isDomStrategy` for every frame (around lines 274-327 and 422-473). Because `isDomStrategy` is a loop-invariant condition evaluated once before the loop, we can hoist it out of the chunk `while` and `for` loop logic, entirely duplicating the loop block.

By isolating these blocks:
1. We allow V8 to execute monomorphic code paths with no redundant dynamic checks.
2. We can discard unused paths (like `timePromise` in DOM and `.screenshotData` in Canvas).
This optimizes parsing and avoids JIT branching. This optimization is effectively identical to what was planned in earlier unclaimed plans (like PERF-1006, 1009, 1010, 1020, 1022) but needs to be rigorously documented and executed as one discrete, clean experiment to finally commit this performance boost.

## Benchmark Configuration
- **Composition URL**: Standard DOM and Canvas single-worker benchmarks
- **Render Settings**: 1080p, 60fps, 10s
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Inside `hasProcessFn` and `!hasProcessFn` loops, V8 evaluates `isDomStrategy` on every single iteration unnecessarily, which bloats the loop and potentially triggers polymorphic inline cache lookups.

## Implementation Spec

### Step 1: Isolate `hasProcessFn` chunk loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker `hasProcessFn` path (around lines 274-327), locate the chunk loop structure:
```javascript
let i = 1;
while (i < totalFrames - 1 && !aborted) {
...
```
Wrap this entire block with an `if (isDomStrategy)` check and duplicate it for the `else` branch.
- In the `isDomStrategy` (DOM) branch:
  - Remove all inner `isDomStrategy` checks and the `else` branches.
  - Omit `timePromise` instantiation and `await` because `DomStrategy` does not use it.
  - Cast `buf` to `Buffer`.
- In the `!isDomStrategy` (Canvas) branch:
  - Remove all inner `isDomStrategy` checks and the `if` branches.
  - Keep the `timePromise` logic.
  - Cast `buf` to `any`.

### Step 2: Isolate `!hasProcessFn` chunk loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker `!hasProcessFn` path (around lines 422-473), apply the exact same transformation. Wrap the chunk loop structure:
```javascript
let i = 1;
while (i < totalFrames - 1 && !aborted) {
...
```
with an `if (isDomStrategy)` check.
- In the `isDomStrategy` (DOM) branch: Remove the `else` branch, omit `timePromise`, and write as `Buffer`.
- In the `!isDomStrategy` (Canvas) branch: Remove the `if` branch, keep `timePromise`, and write as `any`.

## Verification Steps
1. Canvas correctness: `npm run build -w packages/core && npm run test -w packages/renderer verify-canvas-strategy.ts`
2. DOM correctness: `npm run build -w packages/core && npm run test -w packages/renderer verify-dom-strategy-capture.ts`
3. Complete suite: `npm run test -w packages/renderer`
