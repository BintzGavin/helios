---
id: PERF-723
slug: flatten-time-capture-chain
status: complete
claimed_by: "executor-session"
created: 2024-06-11
completed: "2024-06-11"
result: "improved"
---

# PERF-723: Unify Time and Capture Promise Chain

## Focus Area
`CaptureLoop.ts` fast path - specifically the `timeDriver.setTime()` and `strategy.capture()` sequence.

## Background Research
Currently, the fast path evaluates a ternary check on every frame because `timeDriver.setTime` can return `void` (synchronous) or a `Promise` (asynchronous):
```typescript
                const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
                const buffer = setTimeResult
                    ? await setTimeResult.then(() => strategy.capture(page, time))
                    : await strategy.capture(page, time);
```

In PERF-703, sequential awaits were tested and caused a regression. V8 prefers the chained `.then()` inline cache.
In PERF-694, unrolling the loop to skip the ternary check caused a regression because V8 prefers smaller code blocks for inline branch prediction.

However, the only time `setTimeResult` is falsy (void) is on frame 0, when `delta <= 0`. If we change `TimeDriver.setTime` to *always* return a Promise, we can completely eliminate the ternary branch in `CaptureLoop.ts` and use an unconditional chained `.then()` on every single frame. We can return a globally cached `Promise.resolve()` from `CdpTimeDriver` when `delta <= 0` to avoid allocation overhead for frame 0.

By doing so, the hot loop sequence becomes perfectly monomorphic:
```typescript
                const buffer = await timeDriver.setTime(page, compositionTimeInSeconds).then(() => strategy.capture(page, time));
```

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/tests/benchmarks/dom-benchmark`
- **Render Settings**: 1920x1080, 60fps, 10 seconds, `libx264` codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.115s (Current best baseline)
- **Bottleneck analysis**: Ternary branch evaluation inside the hottest inner loop of the renderer.

## Implementation Spec

### Step 1: Ensure `setTime` always returns a Promise
**File**: `packages/renderer/src/drivers/TimeDriver.ts`
**What to change**:
Change the return signature of `setTime`:
```typescript
<<<<<<< SEARCH
  setTime(page: Page, timeInSeconds: number): Promise<void> | void;
=======
  setTime(page: Page, timeInSeconds: number): Promise<void>;
>>>>>>> REPLACE
```

### Step 2: Return cached promise for zero delta in `CdpTimeDriver`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Add a static resolved promise and return it when `delta <= 0`:
```typescript
<<<<<<< SEARCH
export class CdpTimeDriver implements TimeDriver {
=======
const RESOLVED_PROMISE = Promise.resolve();

export class CdpTimeDriver implements TimeDriver {
>>>>>>> REPLACE
```

```typescript
<<<<<<< SEARCH
  setTime(page: Page, timeInSeconds: number): Promise<void> | void {
    return this.runSetTime(page, timeInSeconds);
  }

  private runSetTime(page: Page, timeInSeconds: number): Promise<void> | void {
    const delta = timeInSeconds - this.currentTime;

    // If delta is 0 or negative, we don't advance.
    // In a renderer loop, time usually moves forward.
    if (delta <= 0) {
        return;
    }
=======
  setTime(page: Page, timeInSeconds: number): Promise<void> {
    return this.runSetTime(page, timeInSeconds);
  }

  private runSetTime(page: Page, timeInSeconds: number): Promise<void> {
    const delta = timeInSeconds - this.currentTime;

    // If delta is 0 or negative, we don't advance.
    // In a renderer loop, time usually moves forward.
    if (delta <= 0) {
        return RESOLVED_PROMISE;
    }
>>>>>>> REPLACE
```

### Step 3: Return cached promise for zero delta in `SeekTimeDriver`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Change the signature to `Promise<void>`:
```typescript
<<<<<<< SEARCH
  setTime(page: Page, timeInSeconds: number): Promise<void> | void {
=======
  setTime(page: Page, timeInSeconds: number): Promise<void> {
>>>>>>> REPLACE
```

### Step 4: Remove ternary branch in `CaptureLoop`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker fast path, eliminate the ternary check:
```typescript
<<<<<<< SEARCH
                const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
                const buffer = setTimeResult
                    ? await setTimeResult.then(() => strategy.capture(page, time))
                    : await strategy.capture(page, time);
=======
                const buffer = await timeDriver.setTime(page, compositionTimeInSeconds).then(() => strategy.capture(page, time));
>>>>>>> REPLACE
```
Also update the multi-worker loop to match:
```typescript
<<<<<<< SEARCH
            const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
            try {
                const buffer = setTimeResult
                    ? await setTimeResult.then(() => strategy.capture(page, time))
                    : await strategy.capture(page, time);
                frameBufferRing[ringIndex] = buffer;
=======
            try {
                const buffer = await timeDriver.setTime(page, compositionTimeInSeconds).then(() => strategy.capture(page, time));
                frameBufferRing[ringIndex] = buffer;
>>>>>>> REPLACE
```

**Why**: Removes a branch evaluation from the hottest tight loop, creating a fully monomorphic inline cache for the async sequence.
**Risk**: Negligible.

## Variations
None.

## Canvas Smoke Test
`npm run test -w packages/renderer` - verify no breakages.

## Correctness Check
Run the DOM render benchmark `cd packages/renderer && npm run build && npx tsx scripts/benchmark-perf.ts` and verify the output mp4 visually.

## Results Summary
- **Best render time**: 2.338s (vs local baseline ~2.410s)
- **Improvement**: ~3%
- **Kept experiments**: [Unify Time and Capture Promise Chain]
- **Discarded experiments**: []
