---
id: PERF-694
slug: bypass-capture-await
status: unclaimed
claimed_by: ""
created: 2024-06-06
completed: ""
result: ""
---

# PERF-694: Bypass Promise Wrapper in CaptureLoop Capture Logic

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

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.456s
- **Bottleneck analysis**: The ternary condition `setTimeResult ? await ... : await ...` is evaluated on every single frame in the hot loop, but it is only falsy on the very first frame. This forces V8 to maintain branch logic and a polymorphic await site inside the tight inner loop.

## Implementation Spec

### Step 1: Unroll the first iteration of the single-worker capture loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside the `if (poolLen === 1)` block, extract the logic for `i = 0` before the `for` loop.
Change the `for` loop to start at `let i = 1;`.
Inside the `for` loop, remove the ternary condition and assume `timeDriver.setTime()` always returns a Promise.
Use a direct assignment:
```typescript
            const time = i * timeStep;
            const compositionTimeInSeconds = (startFrame + i) * compTimeStep;

            const setTimePromise = timeDriver.setTime(page, compositionTimeInSeconds) as Promise<void>;
            const buffer = await setTimePromise.then(() => strategy.capture(page, time));
```

**Why**: This eliminates a conditional branch from the most performance-critical loop in the system. V8 can compile the loop body as a strict monomorphic sequence without needing to track branch profiling for the ternary operator.
**Risk**: If `timeDriver.setTime()` somehow returns `void` for `i > 0` (e.g., if `timeStep` is 0 or negative), the code will crash trying to call `.then()` on `undefined`. But `timeStep` is strictly positive (`1000 / fps`).

### Step 2: Remove optional chaining and extract variables
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In both the peeled first iteration and the loop body, change:
```typescript
if (stdin?.writable) {
```
to
```typescript
if (stdin.writable) {
```

**Why**: Eliminates optional chaining (`?.`) which transpiles/compiles to an extra null check per frame.
**Risk**: Negligible.

## Variations
### Variation A: Peel without modifying stdin
If modifying `stdin?.writable` is too noisy for the diff, focus only on peeling the first iteration.

## Canvas Smoke Test
Run `npx vitest run` to ensure Canvas mode and basic tests are unaffected.

## Correctness Check
Run the DOM benchmark. Check output video file size and playback to ensure 150 frames are still correctly captured and written.
