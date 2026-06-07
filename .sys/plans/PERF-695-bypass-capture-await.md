---
id: PERF-695
slug: bypass-capture-await
status: complete
claimed_by: "executor-session"
created: 2024-06-09
completed: 2026-06-07
result: discarded
---

# PERF-695: Bypass Promise Wrapper in CaptureLoop Capture Logic

## Focus Area
The single worker fast-path frame capture hot loop in `CaptureLoop.ts`. Specifically, eliminating the explicit `await` logic on the potentially synchronous `setTime` driver logic and bypassing explicit promise checks by eagerly chaining.

## Background Research
Currently, in `CaptureLoop.ts` we have this code in the hot loop:
```typescript
const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
const buffer = setTimeResult
    ? await setTimeResult.then(() => strategy.capture(page, time))
    : await strategy.capture(page, time);
```
The ternary condition `setTimeResult ? await ... : await ...` is evaluated on every single frame in the hot loop, but it is only falsy on the very first frame. This forces V8 to maintain branch logic and a polymorphic await site inside the tight inner loop. By peeling the first iteration, we can avoid this branch.

Previous attempt PERF-694 (failed) unrolled the first iteration of the single worker fast path. In that attempt, we replaced the ternary with a direct `.then()` assignment assumption:
```typescript
const setTimePromise = timeDriver.setTime(page, compositionTimeInSeconds) as Promise<void>;
const buffer = await setTimePromise.then(() => strategy.capture(page, time));
```
However, this added a `.then()` closure allocation and microtask wrapping to every subsequent frame, negating the branch logic optimization. Because `CdpTimeDriver.ts` was already optimized in PERF-692 to directly return `new Promise` without a `.then()`, adding `.then()` back in `CaptureLoop` added the overhead right back.

Instead, we can unroll the first iteration and use *sequential* native `await`s. In the subsequent frames, we know `setTimeResult` is a Promise, so we can unconditionally await it.

```typescript
const setTimePromise = timeDriver.setTime(page, compositionTimeInSeconds) as Promise<void>;
await setTimePromise;
const buffer = await strategy.capture(page, time);
```

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.347s
- **Bottleneck analysis**: The ternary condition `setTimeResult ? await ... : await ...` is evaluated on every single frame in the hot loop, but it is only falsy on the very first frame.

## Implementation Spec

### Step 1: Unroll the first iteration of the single-worker capture loop using sequential awaits
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the `if (poolLen === 1)` block, extract the logic for `i = 0` before the `for` loop.
For `i = 0`:
```typescript
            if (totalFrames > 0 && !(capturedErrors.length > 0 || (signal && signal.aborted))) {
                const time = 0;
                const compositionTimeInSeconds = startFrame * compTimeStep;
                const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
                if (setTimeResult) await setTimeResult;
                const buffer = await strategy.capture(page, time);

                // ... write logic ...
            }
```

Change the `for` loop to start at `let i = 1;`.
Inside the `for` loop, assume `timeDriver.setTime()` always returns a Promise and use sequential native awaits:
```typescript
            const time = i * timeStep;
            const compositionTimeInSeconds = (startFrame + i) * compTimeStep;

            await timeDriver.setTime(page, compositionTimeInSeconds);
            const buffer = await strategy.capture(page, time);
```

**Why**: This eliminates a conditional branch from the most performance-critical loop in the system, and uses native `await`s which V8 is highly optimized for, avoiding any dynamic promise check or closure allocations via `.then()`.

## Variations
### Variation A: Sequential awaits without unrolling
If unrolling is too verbose, we can just replace the ternary with sequential awaits inside the loop:
```typescript
const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
if (setTimeResult) await setTimeResult;
const buffer = await strategy.capture(page, time);
```

## Canvas Smoke Test
Run `npm run build -w packages/renderer` to ensure no syntax errors.

## Correctness Check
Run the DOM benchmark (`cd packages/renderer && npx tsx scripts/benchmark-perf.ts`) and ensure output videos render correctly.

## Impossibility Explanation
This experiment was discarded because it resulted in a performance regression. The median render time was ~2.854s, compared to the baseline of ~2.347s. Eagerly wrapping the potentially undefined result in a native `Promise.resolve()` and adding a `.then()` chain allocated more closures and microtasks on every frame than simply relying on V8's optimization of the explicit branch and native await.

## Results Summary
```tsv
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	2.854	150	52.56	63.7	discard	eager promise chain capture
2	2.953	150	50.80	63.5	discard	eager promise chain capture
3	2.617	150	57.32	63.6	discard	eager promise chain capture

```
