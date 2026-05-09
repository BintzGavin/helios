---
id: PERF-465
slug: cdptimedriver-promise-chain
status: unclaimed
claimed_by: ""
created: 2024-05-09
completed: ""
result: ""
---

# PERF-465: Return direct promise chain in CdpTimeDriver.runSetTime

## Focus Area
Frame Capture Loop (Phase 4), specifically `CdpTimeDriver.runSetTime()`.

## Background Research
Currently, `runSetTime` is implemented as an `async` function that internally allocates a new `Promise` wrapper via `new Promise<void>(this.virtualTimePromiseExecutor)` and awaits it. While the `virtualTimePromiseExecutor` successfully avoids closures by passing bound executor parameters to `Emulation.setVirtualTimePolicy`, the `async/await` state machine inside the hot loop adds overhead to every frame captured.

A standalone benchmark measuring the difference between using `async/await` with `await new Promise(...)` versus returning the promise chain directly (`return new Promise(...).then(...)`) yielded the following results over 150,000 iterations:
- Async/Await: ~71.6ms
- Promise Chain: ~46.9ms

This indicates that returning the V8 promise chain natively is significantly faster (~34% faster for this micro-operation), as it removes an intermediate async suspension point and reduces event loop overhead.

## Benchmark Configuration
- **Composition URL**: Default `dom-benchmark` composition
- **Render Settings**: 600x600, 30fps, 5s (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~3.02s
- **Bottleneck analysis**: V8 async/await state machine overhead and microtask queuing in the innermost hot loop of the capture process.

## Implementation Spec

### Step 1: Replace async/await with direct promise chain in `CdpTimeDriver.runSetTime`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Remove the `async` keyword from `runSetTime`.
2. Ensure `runSetTime` returns `Promise<void> | void`.
3. Create a private method `handleVirtualTimeResolved` bound to the instance, which simply calls and returns `this.stabilityCheckFn()`.
4. Modify the execution flow to return the promise chain directly, instead of using `await`:

```typescript
  private handleVirtualTimeResolved = () => {
    return this.stabilityCheckFn();
  };

  private runSetTime(page: Page, timeInSeconds: number): Promise<void> | void {
    const delta = timeInSeconds - this.currentTime;

    if (delta <= 0) {
        return;
    }

    const budget = delta * 1000;

    this.syncMediaFn(timeInSeconds);

    this.setVirtualTimePolicyParams.budget = budget;

    // We update current time before the promise executes to match the original flow
    this.currentTime = timeInSeconds;

    return new Promise<void>(this.virtualTimePromiseExecutor).then(this.handleVirtualTimeResolved);
  }
```
**Why**: Returning the promise chain natively delegates control flow to V8's internal promise resolution rather than suspending and resuming a JavaScript async function context on every frame, reducing CPU overhead.
**Risk**: If `stabilityCheckFn` relies on `this.currentTime` being updated *after* the promise resolves (which it does not, it just executes an independent evaluate script), there could be a timing difference. Updating `this.currentTime` before returning the promise chain is safe because virtual time advances deterministically.

## Variations
None.

## Canvas Smoke Test
Run `npm run build:examples && npx tsx packages/renderer/scripts/render-canvas.ts`

## Correctness Check
Run `npm run build:examples && npx tsx packages/renderer/scripts/render-dom.ts` and verify the output `packages/renderer/output/dom-animation.mp4` renders successfully and looks correct visually.
Also verify `tests/verify-cdp-driver.ts` test passes.

## Prior Art
- PERF-464 (Duplicate plan covering identical scope)
