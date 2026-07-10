---
id: PERF-961
slug: remove-redundant-is-dom-strategy-single-worker
status: unclaimed
claimed_by: ""
created: 2025-03-05
completed: ""
result: ""
---

# PERF-961: Remove Redundant `isDomStrategy` Checks in Single-Worker Loop

## Focus Area
`CaptureLoop.ts` - Single-worker fast paths (`hasProcessFn` true and false branches).

## Background Research
PERF-942 unrolled the `isString` check by replacing `if (isString)` with `if (isDomStrategy)` in the single-worker path. This left behind nested `if (isDomStrategy)` checks that are now tautological and completely redundant.

Specifically, inside `CaptureLoop.ts` around lines 260 and 526, there is an outer `if (isDomStrategy)` block that immediately contains an inner `if (isDomStrategy)` block. Since the outer block already guarantees `isDomStrategy` is true, evaluating the inner check again is entirely unnecessary parser overhead and increases the size of the AST, potentially slowing down V8's JIT compilation of this hot loop.

By removing the redundant inner `if (isDomStrategy)` check and its corresponding closing brace, we simplify the loop structure.

## Benchmark Configuration
- **Composition URL**: Any standard DOM composition
- **Render Settings**: Standard
- **Mode**: `dom` (single-worker path)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Redundant conditional checks inside hot loops bloat the AST and reduce V8 optimization potential.

## Implementation Spec

### Step 1: Remove Redundant Nested `if (isDomStrategy)` in `hasProcessFn = true` path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker `if (hasProcessFn)` path (around lines 259-260), find:
```typescript
            if (isDomStrategy) {
              if (isDomStrategy) {
                let i = 1;
                while (i < totalFrames - 1 && !aborted) {
```
Remove the inner `if (isDomStrategy) {` and remove its corresponding closing brace (which occurs right before the `} else {` for the canvas path).

### Step 2: Remove Redundant Nested `if (isDomStrategy)` in `hasProcessFn = false` path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker `else` path (`hasProcessFn` is false, around lines 525-526), find:
```typescript
            if (isDomStrategy) {
              if (isDomStrategy) {
                let i = 1;
                while (i < totalFrames - 1 && !aborted) {
```
Remove the inner `if (isDomStrategy) {` and its corresponding closing brace.

## Variations
None.

## Correctness Check
Run tests to ensure no syntax errors and that DOM rendering is still correct.
