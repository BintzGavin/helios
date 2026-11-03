---
id: PERF-1168
slug: remove-await-timepromise-dom
status: unclaimed
claimed_by: ""
created: 2026-11-03
completed: ""
result: ""
---

# PERF-1168: Remove unnecessary `await timePromise` checks in DOM fast paths

## Focus Area
The single-worker and multi-worker DOM fast paths (`isDomStrategy === true`) in `CaptureLoop.ts` evaluate and await `timePromise`.

## Background Research
For `isDomStrategy`, `CdpTimeDriver.setTime` does not return a Promise when `mode === 'dom'` (it typically completes synchronously and returns `undefined`). This means `timePromise` is actually falsy!

In both single-worker and multi-worker paths, there are multiple occurrences of:
```typescript
const timePromise = timeDriver.setTime( ... );
if (timePromise) {
  await timePromise;
}
```
For `isDomStrategy === true`, `timePromise` is always `undefined`, so `if (timePromise)` is always false. By removing `const timePromise = ` and the `if (timePromise)` block entirely for the DOM paths, we eliminate per-frame branch evaluation overhead and AST bloat, which speeds up V8 execution in the hot path.

## Baseline
- **Bottleneck analysis**: The `if (timePromise)` check is executed inside every inner loop of single-worker fast paths and potentially single-frame captures. Removing it for `isDomStrategy` paths removes branching overhead.

## Implementation Spec

### Step 1: Update single-worker paths
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker path for `isDomStrategy === true`:
Change all instances of:
```typescript
const timePromise = timeDriver.setTime( ... );
if (timePromise) await timePromise;
```
to simply:
```typescript
timeDriver.setTime( ... );
```
Specifically around lines 172-176 and 181-185.

**Why**: Avoids assignment, branching, and V8 ast nodes overhead for the DOM rendering hot path where `timePromise` is always `undefined`.
**Risk**: If `timeDriver.setTime()` changes to return a promise for DOM mode, it would no longer be awaited.

### Step 2: Update multi-worker paths
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker `runWorker` function for `isDomStrategy === true` (lines 488-491), replace:
```typescript
const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
if (timePromise) {
  await timePromise;
}
```
with:
```typescript
timeDriver.setTime(page, (startFrame + i) * compTimeStep);
```
**Why**: Same as Step 1, but for the multi-worker DOM actor closure.

## Variations
None.

## Correctness Check
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=dom` to ensure no degradation.
Run `npm run test --workspace=packages/renderer` to ensure frame logic outputs properly.
