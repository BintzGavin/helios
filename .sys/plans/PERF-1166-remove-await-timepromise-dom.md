---
id: PERF-1166
slug: remove-await-timepromise-dom
status: unclaimed
claimed_by: ""
created: 2026-11-02
completed: ""
result: ""
---

# PERF-1166: Remove unnecessary `await timePromise` checks in DOM fast paths

## Focus Area
The single-worker and multi-worker DOM fast paths (`isDomStrategy === true`) in `CaptureLoop.ts` evaluate and await `timePromise`.

## Background Research
Based on `PERF-874`, for `isDomStrategy`, `CdpTimeDriver.setTime` does not return a Promise when `mode === 'dom'` (it explicitly returns `undefined` via `return;`). This means `timePromise` is actually falsy!

In both single-worker and multi-worker paths, there are multiple occurrences of:
```typescript
const timePromise = timeDriver.setTime( ... );
if (timePromise) await timePromise;
```
For `isDomStrategy === true`, `timePromise` is always `undefined`, so `if (timePromise)` is always false. By removing `const timePromise = ` and the `if (timePromise) await timePromise;` block entirely for the DOM paths, we eliminate per-frame branch evaluation overhead and AST bloat, which speeds up V8 execution in the hot path.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark composition
- **Render Settings**: Same as baseline
- **Mode**: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~500ms
- **Bottleneck analysis**: The `if (timePromise)` check is executed inside every inner loop of single-worker fast paths and potentially single-frame captures. Removing it for `isDomStrategy` paths removes branching overhead.

## Implementation Spec

### Step 1: Update single-worker paths
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker path for `isDomStrategy === true` (lines ~166 to ~270):
Change all instances of:
```typescript
const timePromise = timeDriver.setTime(page, ...);
if (timePromise) await timePromise;
```
to simply:
```typescript
timeDriver.setTime(page, ...);
```
**Why**: Avoids assignment, branching, and V8 ast nodes overhead for the DOM rendering hot path where `timePromise` is always `undefined`.
**Risk**: If `timeDriver.setTime()` changes to return a promise for DOM mode, it would no longer be awaited.

### Step 2: Update multi-worker paths
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker `runWorker` function for `isDomStrategy === true` (lines ~475 to ~500), replace:
```typescript
const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
if (timePromise) await timePromise;
```
with:
```typescript
timeDriver.setTime(page, (startFrame + i) * compTimeStep);
```

## Variation
None.

## Canvas Smoke Test
Run canvas benchmark to verify no degradation.

## Correctness Check
Run FFmpeg verify tests to ensure frame logic outputs properly.
