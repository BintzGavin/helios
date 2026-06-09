---
id: PERF-724
slug: eliminate-dom-strategy-promise-chain
status: complete
claimed_by: "executor-session"
claimed_by: ""
created: 2026-06-09
completed: ""
result: ""
---

# PERF-724: Eliminate DomStrategy Promise Chain

## Focus Area
`DomStrategy.capture()` and `CaptureLoop.ts` fast path.

## Background Research
In `DomStrategy.ts`, the `capture` method calls `cdpSession!.send('HeadlessExperimental.beginFrame', ...)` which returns a Promise. Currently, we append a `.then(this.handleBeginFrameResult)` to this Promise to synchronously extract the `screenshotData` property from the CDP result object. This creates an additional microtask and Promise allocation on every single frame.

In PERF-699, we removed the `async/await` wrapper around this method, which yielded a significant improvement. Building on that, we can completely eliminate this internal `.then()` chain by returning the raw CDP Promise directly to `CaptureLoop.ts`, and performing the synchronous result extraction *after* the fast path await sequence completes.

V8 microtask overhead is a major bottleneck in the tight inner loop. By offloading the synchronous formatting to a new optional method `processCaptureResult` on `RenderStrategy`, `CaptureLoop` can process the raw result without allocating an intermediate Promise, reducing the total Promise allocations per frame.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/tests/benchmarks/dom-benchmark`
- **Render Settings**: 1920x1080, 60fps, 10 seconds, `libx264` codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.338s (Current best)
- **Bottleneck analysis**: Unnecessary `.then()` Promise chaining inside `DomStrategy.capture()` adding microtask allocations to the V8 event loop.

## Implementation Spec

### Step 1: Add `processCaptureResult` to `RenderStrategy`
**File**: `packages/renderer/src/strategies/RenderStrategy.ts`
**What to change**:
Add an optional method to the interface to allow strategies to process their results synchronously without Promise chains.
```typescript
  /**
   * Optional synchronous post-processing step for the capture result.
   * Used to avoid Promise.then() chaining overhead in the hot loop.
   */
  processCaptureResult?(rawResult: any): string | Buffer;
```

### Step 2: Migrate `handleBeginFrameResult` to `processCaptureResult` in `DomStrategy`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Rename `handleBeginFrameResult` to `processCaptureResult`, make it public, and remove the `.then()` chain in `capture()`.
```typescript
<<<<<<< SEARCH
  private handleBeginFrameResult = (result: any): string | Buffer => {
    return (this.lastFrameData = result.screenshotData || this.lastFrameData)!;
  };

  capture(page: Page, frameTime: number): Promise<Buffer | string> {
    return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams)
      .then(this.handleBeginFrameResult);
  }
=======
  processCaptureResult(result: any): string | Buffer {
    return (this.lastFrameData = result.screenshotData || this.lastFrameData)!;
  }

  capture(page: Page, frameTime: number): Promise<any> {
    return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
  }
>>>>>>> REPLACE
```

### Step 3: Update `CaptureLoop.ts` to use `processCaptureResult`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Update both the single-worker fast path and multi-worker loops to extract the buffer synchronously instead of relying on the strategy to return the final buffer inside a Promise wrapper.

In single-worker fast path (around line 34):
```typescript
<<<<<<< SEARCH
                const buffer = await timeDriver.setTime(page, compositionTimeInSeconds).then(() => strategy.capture(page, time));

                if (i === nextProgressFrame) {
=======
                const rawResult = await timeDriver.setTime(page, compositionTimeInSeconds).then(() => strategy.capture(page, time));
                const buffer = strategy.processCaptureResult ? strategy.processCaptureResult(rawResult) : rawResult;

                if (i === nextProgressFrame) {
>>>>>>> REPLACE
```

In multi-worker loop (around line 140):
```typescript
<<<<<<< SEARCH
            try {
                const buffer = await timeDriver.setTime(page, compositionTimeInSeconds).then(() => strategy.capture(page, time));
                frameBufferRing[ringIndex] = buffer;
                frameReadyRing[ringIndex] = 1;
            } catch (e) {
=======
            try {
                const rawResult = await timeDriver.setTime(page, compositionTimeInSeconds).then(() => strategy.capture(page, time));
                const buffer = strategy.processCaptureResult ? strategy.processCaptureResult(rawResult) : rawResult;
                frameBufferRing[ringIndex] = buffer;
                frameReadyRing[ringIndex] = 1;
            } catch (e) {
>>>>>>> REPLACE
```
**Why**: Removes one Promise allocation and one microtask execution per frame.
**Risk**: Minimal. Synchronous execution remains synchronous, just shifted out of the Promise microtask queue into the main await sequence.

## Variations
None.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to ensure `CanvasStrategy` is unaffected by the interface addition.

## Correctness Check
Run the DOM render benchmark `cd packages/renderer && npm run build && npx tsx scripts/benchmark-perf.ts` and visually verify output is correct.

## Prior Art
- PERF-699 (Removed async/await from capture).


## Results Summary
- **Best render time**: 2.192s (vs baseline 2.613s)
- **Improvement**: 16.11%
- **Kept experiments**: [PERF-724]
- **Discarded experiments**: []