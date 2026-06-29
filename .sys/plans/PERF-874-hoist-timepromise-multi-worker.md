---
id: PERF-874
slug: hoist-timepromise-multi-worker
status: unclaimed
claimed_by: ""
created: 2024-06-29
completed: ""
result: ""
---

# PERF-874: Unswitch `timePromise` checks in `CaptureLoop.ts` multi-worker paths

## Focus Area
The multi-worker fast paths in `CaptureLoop.ts` optionally await `timePromise` with an `if (timePromise)` check on every iteration.

## Background Research
PERF-870 successfully removed the `if (timePromise)` branch evaluation from the single-worker hot loops, yielding an execution speedup by unswitching checks where `timePromise` is guaranteed to be a Promise (i.e. `isDomStrategy === true`).

However, for `isDomStrategy`, `CdpTimeDriver.setTime` does not return a Promise when `mode === 'dom'` (it explicitly returns `undefined` via `return;`). This means `timePromise` is actually falsy! In single-worker paths (PERF-870), we incorrectly changed it to unconditionally `await timePromise`, which still works (awaiting `undefined` is valid in JS but incurs minor microtask overhead) but isn't strictly necessary.

For multi-worker paths (e.g. `!hasProcessFn` path and `hasProcessFn` path for `!isDomStrategy`), there are remaining `if (timePromise) await timePromise;` evaluations inside loops. We can entirely eliminate the `await timePromise;` block for `isDomStrategy === true` chunks because `timePromise` is always `undefined`.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark composition
- **Render Settings**: Same as baseline
- **Mode**: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: Unknown
- **Bottleneck analysis**: Microtask queueing overhead for `await undefined`.

## Implementation Spec

### Step 1: Remove `await timePromise;` from single-worker DOM fast paths
Use `sed` to remove the unnecessary `await timePromise;` calls in `packages/renderer/src/core/CaptureLoop.ts` for the inner loops of the `isDomStrategy === true` single-worker paths.

### Step 2: Remove `await timePromise;` from multi-worker DOM fast paths
In multi-worker `runWorker`, remove `await timePromise;` for `isDomStrategy === true` paths.

## Variations
None.

## Canvas Smoke Test
Run canvas benchmark to verify no degradation.

## Correctness Check
Run FFmpeg verify tests to ensure frame logic outputs properly.
