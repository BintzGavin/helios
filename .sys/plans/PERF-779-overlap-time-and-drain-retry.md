---
id: PERF-779
slug: overlap-time-and-drain-retry
status: complete
claimed_by: "executor-session"
created: 2024-06-16
completed: "2024-06-16"
result: "failed"
---
# PERF-779: Overlap Time Progression with FFmpeg Drain (Retry)

## Focus Area
`CaptureLoop.ts` fast path execution loop (single-worker path). Specifically, overlapping the asynchronous CDP rendering call with the synchronous FFmpeg IO stream writing to avoid sequential stalling.

## Background Research
Currently in the single worker fast path:
```typescript
await timeDriver.setTime(page, compositionTimeInSeconds);
const buffer = strategy.processCaptureResult!(await strategy.capture(page, time));
// ... write to stdin ...
if (!canWriteMore && stdin.writableLength >= 16777216) {
    await this.drainPromise;
}
```

When `canWriteMore` is false and the buffer is full, we `await this.drainPromise;`. This blocks the loop and yields to the Node.js event loop until FFmpeg drains its input buffer. The loop ONLY triggers the *next* frame's rendering (`await timeDriver.setTime()`) *after* the drain finishes.

By advancing `timeDriver.setTime()` for the *next* frame *before* we potentially await `this.drainPromise`, we can overlap the FFmpeg pipe drain with Chromium's rendering of the next frame. Chromium rendering and FFmpeg encoding happen in separate OS processes.

Instead of doing:
```typescript
for (let i = 0; i < totalFrames; i++) {
  // Wait for frame i to render
  await timeDriver.setTime(page, t_i);
  const buffer = await capture(...);

  // Wait for drain
  if (needsDrain) {
     await this.drainPromise;
  }
}
```

We can pipeline it by keeping track of an ongoing drain promise from the *previous* frame write, and resolving it *after* setting the time for the *current* frame.
This effectively revives the concept from PERF-717, which showed a performance regression because of how it was implemented or overlapping `setTime` with `capture()`. Here we want to overlap `drainPromise` with `setTime`.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition
- **Render Settings**: Standard benchmark settings
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.069s (latest benchmark run)
- **Bottleneck analysis**: The node thread is blocking on IPC pipe IO (`drainPromise`), completely pausing Chromium rendering, creating a sequential pipeline stall.

## Implementation Spec

### Step 1: Hoist drain await to the start of the next loop iteration
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker `if (hasProcessFn)` fast path `for` loop, introduce a `let previousDrainPromise: Promise<void> | undefined;` before the loop.

Inside the loop:
1. Call `await timeDriver.setTime(page, compositionTimeInSeconds);`
2. **If `previousDrainPromise` is set**, `await previousDrainPromise;` and then reset it to `undefined`.
3. Call `const buffer = strategy.processCaptureResult!(await strategy.capture(page, time));`
4. When writing to the stream:
   If we need to drain, do NOT `await this.drainPromise;` immediately. Instead, assign `previousDrainPromise = this.drainPromise;`.

Repeat the exact same logic for the `else` (no `processCaptureResult`) branch of the fast path.

After the `for` loop, add a check:
`if (previousDrainPromise) await previousDrainPromise;`

**Why**: By triggering `timeDriver.setTime()` *before* awaiting the drain promise, Chromium can begin processing the new composition time, running animations, and performing layout/paint while Node.js waits for the FFmpeg pipe to drain.
**Risk**: Timeouts if the pipe drain takes longer than the `stabilityTimeout`, but PLAYWRIGHT/CDP handles slow scripts fine.

## Variations
None.

## Correctness Check
Run `npx tsx scripts/benchmark-perf.ts` and verify output.

## Results Summary
- **Best render time**: ~2.580s (vs baseline ~2.069s)
- **Improvement**: Regressed
- **Kept experiments**:
- **Discarded experiments**: Overlap Time Progression with FFmpeg Drain (Retry)
