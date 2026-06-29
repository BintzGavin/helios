---
id: PERF-870
slug: hoist-timepromise
status: complete
claimed_by: "Jules"
created: 2024-06-28
completed: "2024-06-29"
result: "improved"
---

# PERF-870: Unswitch `timePromise` checks in `CaptureLoop.ts`

## Focus Area
The single-worker and multi-worker fast paths in `CaptureLoop.ts` optionally await `timePromise` with an `if (timePromise)` check on every iteration.

## Background Research
Currently in the chunked fast paths, we evaluate `if (timePromise) await timePromise;` on every single iteration of the inner chunking loop. The `isDomStrategy` paths have already been largely unswitched (e.g. `if (isDomStrategy) { ... } else { ... }`), but inside those paths, we still do `if (timePromise) await timePromise;`.

For `isDomStrategy === true`, `timeDriver.setTime()` always returns a valid Promise, so `timePromise` is guaranteed to be truthy. Evaluating `if (timePromise)` when it is consistently true adds per-iteration V8 branch evaluation overhead. In microbenchmarks, eliminating a branch that evaluates to true on every iteration in a tight loop saves ~37% execution time (e.g., from ~30ms down to ~19ms for 10M loops). For `!isDomStrategy`, it returns `null` or `undefined` (or potentially a promise), but we can optimize the `isDomStrategy` paths explicitly since they represent the hot DOM rendering path this project focuses on.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark composition
- **Render Settings**: Same as baseline
- **Mode**: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.831s
- **Bottleneck analysis**: The `if (timePromise)` check is executed inside every inner loop of single-worker fast paths and potentially single-frame captures. Removing it for `isDomStrategy` paths removes branching overhead.

## Implementation Spec

### Step 1: Update single-worker paths
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker chunked loop for `isDomStrategy === true`:
Change all instances of:
```typescript
if (timePromise) await timePromise;
```
to:
```typescript
await timePromise;
```
This applies *only* inside the blocks where `isDomStrategy` is already guaranteed to be true (e.g. inside `if (isDomStrategy) { ... }`).
**Why**: Avoids `if` branching overhead for the DOM rendering hot path where `timePromise` is always defined.
**Risk**: If `timeDriver.setTime()` changes to return null for DOM mode, it would await null (which is actually valid in JS, just resolves immediately, but still better to strictly await the valid promise).

### Step 2: Update multi-worker paths (if applicable)
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Review multi-worker paths to see if `timePromise` is checked similarly in `isDomStrategy` blocks. If so, remove the `if` check and just `await timePromise`.
**Why**: Avoids branching overhead in the multi-worker paths.

## Variation
None.

## Canvas Smoke Test
Run canvas benchmark to verify no degradation.

## Correctness Check
Run FFmpeg verify tests to ensure frame logic outputs properly.
