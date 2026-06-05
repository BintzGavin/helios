---
id: PERF-677
slug: eliminate-internal-promise-chain
status: unclaimed
claimed_by: ""
created: 2024-06-05
completed: ""
result: ""
---

# PERF-677: Eliminate Internal Promise Chain in CdpTimeDriver

## Focus Area
DOM Rendering Pipeline - Hot Loop in `packages/renderer/src/drivers/CdpTimeDriver.ts`.

## Background Research
Currently, `CdpTimeDriver.runSetTime` returns a promise chain:
```typescript
    return promise.then(() => {
      this.currentTime = timeInSeconds;
    });
```
This allocates an extra `Promise` and a closure `() => { this.currentTime = timeInSeconds; }` on every frame. Furthermore, in `CaptureLoop.ts`, the caller executes:
```typescript
await setTimeResult.then(() => strategy.capture(page, time))
```
Because `setTimeResult` is already a chained promise, this creates a promise chain of depth 2 and adds unnecessary microtask overhead to the V8 event loop.
By eagerly updating `this.currentTime = timeInSeconds;` and directly returning the base `promise`, we can eliminate one promise allocation, one closure allocation, and one microtask tick per frame. Since `runSetTime` is strictly awaited sequentially, eagerly advancing `currentTime` before the promise resolves is functionally identical and perfectly safe.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.447s
- **Bottleneck analysis**: Microtask and closure allocation overhead caused by redundant promise chaining in the virtual time progression loop.

## Implementation Spec

### Step 1: Eagerly advance current time to eliminate promise chain
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In `runSetTime()`, update `this.currentTime` eagerly before returning the promise, completely eliminating the `.then()` chain.

```typescript
<<<<<<< SEARCH
    this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams).catch(this.handleVirtualTimeBudgetError);
    return promise.then(() => {
      this.currentTime = timeInSeconds;
    });
=======
    this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams).catch(this.handleVirtualTimeBudgetError);
    this.currentTime = timeInSeconds;
    return promise;
>>>>>>> REPLACE
```

**Why**: By returning the base promise directly, we avoid allocating an intermediate Promise and a closure on every single frame, effectively halving the promise chaining overhead for the time-advance phase.
**Risk**: If `runSetTime` were called concurrently without awaiting, `currentTime` would advance prematurely. However, the architecture strictly guarantees sequential execution per-worker (via `CaptureLoop.ts`), making this perfectly safe.

## Variations
None.

## Canvas Smoke Test
Run `cd packages/renderer && npm run test` to ensure canvas/core operations remain unaffected.

## Correctness Check
Run the DOM render benchmark `cd packages/renderer && npx tsx scripts/benchmark-perf.ts` and verify output integrity and performance times.

## Prior Art
- **PERF-662**: Inlined `virtualTimePromiseExecutor` to avoid pre-bound method closures, which yielded a performance improvement. This builds upon that by eliminating the `.then()` closure as well.
- **PERF-652**: Tried removing `.then()` inside `CaptureLoop.ts` in favor of sequential awaits, but failed because V8 optimizes the specific ternary promise pattern well. This optimization specifically targets the hidden, redundant `.then()` inside `CdpTimeDriver.ts`.
