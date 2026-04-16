---
id: PERF-292
slug: eliminate-format-response-call
status: claimed
claimed_by: "executor-session"
created: 2024-05-18
completed: "2024-05-18"
result: "no-improvement"
---

# PERF-292: Eliminate Redundant Function.prototype.call Overhead in CaptureLoop.ts

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - `runWorker` hot path loop.

## Background Research
Inside `CaptureLoop.ts`, the multi-worker ACTOR MODEL retrieves a frame buffer by awaiting the strategy capture phase and then formatting the response:
`const buffer = formatResponse ? formatResponse.call(strategy, rawResponse) : rawResponse;`

The `formatResponse` methods defined in strategies (e.g., `DomStrategy.ts`) are implemented as arrow functions bound to instance properties (`public formatResponse = (res: any) => { ... }`). Because they are arrow functions, their lexical `this` is inherently bound to the strategy instance at creation time.

Using `Function.prototype.call(strategy, rawResponse)` on an arrow function does not override the lexical `this` but it does incur the invocation overhead of `.call()` during dynamic dispatch. Removing `.call()` and invoking the function directly (`formatResponse(rawResponse)`) eliminates this redundant dispatch penalty inside the tight `while(!aborted)` loop without altering behavior.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition (from `scripts/benchmark-test.js`)
- **Render Settings**: 1280x720, 30 FPS, 3s duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.040s
- **Bottleneck analysis**: The overhead from repeatedly applying `Function.prototype.call` on an arrow function in the hot path. V8 performs significantly better when executing direct invocations over `.call()`.

## Implementation Spec

### Step 1: Replace `.call` with direct invocation
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `CaptureLoop.ts`, locate the `runWorker` function and replace `formatResponse.call`:

```typescript
<<<<<<< SEARCH
            try {
                timeDriver.setTime(page, compositionTimeInSeconds).then(undefined, noopCatch);
                const rawResponse = await strategy.capture(page, time);
                const buffer = formatResponse ? formatResponse.call(strategy, rawResponse) : rawResponse;
                if (ctx.resolve) ctx.resolve(buffer);
            } catch (e) {
=======
            try {
                timeDriver.setTime(page, compositionTimeInSeconds).then(undefined, noopCatch);
                const rawResponse = await strategy.capture(page, time);
                const buffer = formatResponse ? formatResponse(rawResponse) : rawResponse;
                if (ctx.resolve) ctx.resolve(buffer);
            } catch (e) {
>>>>>>> REPLACE
```

**Why**: By invoking `formatResponse(rawResponse)` directly, we avoid the redundant dynamic dispatch overhead of `.call()`, which improves execution speed in V8 tight loops.

**Risk**: Negligible risk since `formatResponse` is always defined as an arrow function bound to the strategy instance.

### Step 2: Verification
Use `run_in_bash_session` to execute the benchmark `cd packages/renderer && npx tsx scripts/benchmark-test.js` to verify performance gains. Update the journal with the final render time in `.sys/perf-results.tsv`. Update `docs/status/RENDERER-EXPERIMENTS.md` with findings.

## Variations
No variations.

## Canvas Smoke Test
Run benchmark-test.js on canvas mode.

## Correctness Check
Output video should still be 90 frames and render correctly.

## Results Summary
- **Best render time**: 32.204s (vs baseline 32.112s)
- **Improvement**: 0%
- **Kept experiments**: None
- **Discarded experiments**: Eliminate `formatResponse.call` in `CaptureLoop.ts`
