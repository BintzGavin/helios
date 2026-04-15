---
id: PERF-282
slug: inline-promise-allocation
status: unclaimed
claimed_by: ""
created: 2026-04-15
completed: ""
result: ""
---

# PERF-282: Inline Promise Allocation for Small Frame Counts in SeekTimeDriver

## Focus Area
`packages/renderer/src/drivers/SeekTimeDriver.ts` in the `setTime()` hot loop when iterating over `cachedFrames`.

## Background Research
Currently in `SeekTimeDriver.ts`, when `frames.length > 1`, a loop maps `frames[i].evaluate(...)` across all frames and assigns them to `this.cachedPromises`. We know from earlier optimizations (e.g., PERF-272 and PERF-283) that V8 struggles when dynamically indexing into arrays and mapping array elements to closures within hot loops. Although PERF-283 preallocated `this.cachedPromises` correctly, the loop itself may cause V8 optimization issues compared to inline static evaluation. If the number of frames is predictably small (e.g., 2 or 3 frames), we can inline the promise array creation completely, bypassing the `for` loop overhead entirely:

```typescript
    if (frames.length === 2) {
      this.evaluateArgs[0] = timeInSeconds;
      return Promise.all([
        frames[0].evaluate(this.evaluateClosure, this.evaluateArgs),
        frames[1].evaluate(this.evaluateClosure, this.evaluateArgs)
      ]) as unknown as Promise<void>;
    }
```
This is functionally identical to the dynamic loop but avoids loop control flow variables, array indexing inside the loop, and helps V8's monomorphic assumptions, since small multi-frame scenes are very common.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: 1280x720, 30fps, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.245s (PERF-283)
- **Bottleneck analysis**: The dynamically mapped `this.cachedPromises` assignment and evaluation loop inside `setTime()` for multi-frame contexts.

## Implementation Spec

### Step 1: Add inline blocks for `frames.length === 2` and `frames.length === 3`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Inside `setTime()`, after the `frames.length === 1` block and before the dynamic loop fallback, add explicit inline checks:
```typescript
    if (frames.length === 2) {
      this.evaluateArgs[0] = timeInSeconds;
      return Promise.all([
        frames[0].evaluate(this.evaluateClosure, this.evaluateArgs),
        frames[1].evaluate(this.evaluateClosure, this.evaluateArgs)
      ]) as unknown as Promise<void>;
    }

    if (frames.length === 3) {
      this.evaluateArgs[0] = timeInSeconds;
      return Promise.all([
        frames[0].evaluate(this.evaluateClosure, this.evaluateArgs),
        frames[1].evaluate(this.evaluateClosure, this.evaluateArgs),
        frames[2].evaluate(this.evaluateClosure, this.evaluateArgs)
      ]) as unknown as Promise<void>;
    }
```

**Why**: By asserting small array lengths statically and avoiding the `for` loop for the most common multi-frame cases, V8 can optimize the Promise allocations and inline the `evaluateClosure` more efficiently.
**Risk**: If there are more than 3 frames, it will simply fall back to the existing `for` loop implementation. No functional risk.

## Variations
None.

## Canvas Smoke Test
Verify canvas functionality remains intact.

## Correctness Check
Run the DOM benchmark and ensure frame count remains accurate and visual correctness is retained.
