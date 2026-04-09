---
id: PERF-229
slug: bypass-seek-time-evaluate
status: unclaimed
claimed_by: ""
created: 2024-04-09
completed: ""
result: ""
---
# PERF-229: Pre-allocate Fallback Evaluate Array in SeekTimeDriver

## Focus Area
`SeekTimeDriver.ts` hot loop (`setTime`) string evaluation array allocation

## Background Research
The `setTime` loop in `SeekTimeDriver.ts` uses Playwright's `frame.evaluate` when there are multiple frames in the page. When evaluating `__helios_seek(t, timeoutMs)`, it passes an array `[timeInSeconds, this.timeout]` to Playwright's `evaluate`. Currently, a new array `[timeInSeconds, this.timeout]` is allocated on every frame in every call to `setTime`. We can eliminate this dynamic object allocation by caching an array and mutating its elements, just like what we did for `callParams.arguments` in PERF-224. This reduces garbage collection overhead inside the V8 engine and could lead to marginal performance improvements, especially when dealing with complex pages containing multiple iframes.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080, 30fps, dom mode, duration 5s
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 35.624s
- **Bottleneck analysis**: Micro-stalls caused by V8 Garbage Collector allocating and discarding short-lived Arrays inside the hot loop.

## Implementation Spec

### Step 1: Pre-cache evaluation parameters array
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
1. Add a private cached array to the `SeekTimeDriver` class:
   `private evaluateArgs: [number, number] = [0, 0];`
2. In the `constructor`, set the timeout value:
   `this.evaluateArgs[1] = timeout;`
3. In `setTime`, inside the multi-frame fallback block `for (let i = 0; i < frames.length; i++)`, mutate the first element instead of allocating `[timeInSeconds, this.timeout]`:
   ```typescript
   this.evaluateArgs[0] = timeInSeconds;
   for (let i = 0; i < frames.length; i++) {
     promises[i] = frames[i].evaluate(
       ([t, timeoutMs]) => { (window as any).__helios_seek(t, timeoutMs); },
       this.evaluateArgs
     );
   }
   ```
   Do the same for the single frame fallback condition:
   ```typescript
   if (frames.length === 1) {
     this.evaluateArgs[0] = timeInSeconds;
     return frames[0].evaluate(
       ([t, timeoutMs]) => { (window as any).__helios_seek(t, timeoutMs); },
       this.evaluateArgs
     );
   }
   ```

**Why**: This completely eliminates new short-lived array allocations per frame iteration during V8 execution, avoiding unnecessary garbage collection and improving the execution time of the `setTime` method.
**Risk**: Playwright might internally modify the array, although Playwright's `evaluate` serializes arguments, so this is highly unlikely.

## Correctness Check
Run `npx tsx packages/renderer/scripts/benchmark-test.js` to ensure the benchmark still runs correctly and successfully completes without errors. Run unit tests (`npx tsx packages/renderer/tests/run-all.ts`) to ensure functionality.
