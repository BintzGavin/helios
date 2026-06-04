---
id: PERF-672
slug: eliminate-captureloop-allocations
status: complete
claimed_by: "executor-session"
created: 2024-06-04
completed: "2024-06-04"
result: "discard"
---
# PERF-672: Eliminate Final Per-Frame Allocations in CaptureLoop

## Focus Area
The `CaptureLoop` hot loop, specifically targeting the elimination of the final two per-frame memory and callback allocations: the `stdin.write` Node.js callback and the `.then()` capture closure.

## Background Research
In highly optimized V8 loops, allocating closures and registering callbacks on every iteration adds overhead due to garbage collection and event loop scheduling.
1. **Node.js `stdin.write` Callback**: Passing a callback to Node's stream `write()` method forces Node to allocate an internal libuv task to track and execute the callback once the chunk is flushed to the OS. By omitting the callback, Node bypasses this allocation entirely and relies purely on the stream's `error` event for failures (which we already catch via `setupDrainListeners`).
2. **V8 Closure Allocation**: The `runWorker` method currently creates an anonymous closure `() => strategy.capture(page, time)` on every frame to pass to `setTimeResult.then()`. By pre-binding a `captureNext` closure and updating a local `currentTime` variable, we can reuse the exact same function reference for every frame, eliminating the allocation.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 150 frames, dom mode, 30fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.447s
- **Bottleneck analysis**: The overhead of allocating and executing wrapper callbacks in both the V8 engine and libuv event loop for every single frame during the synchronous capture/write phase.

## Implementation Spec

### Step 1: Remove `handleWriteError` and `stdin.write` callbacks
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Delete the `private handleWriteError = (err?: Error | null) => { ... }` method entirely.
2. In `run` (the write loop), remove `this.handleWriteError` from the `stdin.write` calls:
   Change `canWriteMore = stdin.write(buffer, 'base64', this.handleWriteError);` to `canWriteMore = stdin.write(buffer, 'base64');`
   Change `canWriteMore = stdin.write(buffer, this.handleWriteError);` to `canWriteMore = stdin.write(buffer);`
3. Do the same for the `finalBuffer` write at the end of the `run` method.
**Why**: Prevents Node.js from scheduling a callback execution in the libuv event loop for every frame written, reducing IPC overhead. Error handling is already covered by the stream's `'error'` event listener.
**Risk**: None. Errors like `EPIPE` will naturally emit on the stream and be caught by the existing `FFmpegManager` listeners.

### Step 2: Pre-bind Capture Closure
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside `runWorker`, before the `while(!aborted)` loop, declare:
```typescript
let currentTime = 0;
const captureNext = () => strategy.capture(page, currentTime);
```
Inside the loop, immediately update `currentTime = time;` and replace the anonymous closure in `.then()`:
```typescript
// Replace:
// await setTimeResult.then(() => strategy.capture(page, time))
// With:
// await setTimeResult.then(captureNext)
```
**Why**: Reuses a single closure reference for the `.then()` chain instead of allocating a new anonymous function on every frame.
**Risk**: Minor risk of `currentTime` state bleeding if async execution order gets mixed up, but since `runWorker` strictly `awaits` the chain before the next loop iteration, `currentTime` is deterministic.

## Canvas Smoke Test
Run `npx tsx scripts/benchmark-perf.ts --mode canvas` to ensure the strategy pattern abstraction and `CaptureLoop` still work for Canvas rendering.

## Correctness Check
Run the standard DOM benchmark and verify the output `dom-benchmark.mp4` successfully renders without stuttering or hanging.

## Prior Art
- PERF-652 explored sequential `await` but failed. This approach keeps the highly optimized ternary `.then()` chain while simply removing the closure allocation.
- PERF-671 explored eliminating allocations for type checking but failed because V8 optimizes operators better than branches. This targets actual object/function memory allocations, which V8 cannot entirely elide when passed to native boundaries like Node streams.

## Results Summary
- **Best render time**: ~2.522s (vs baseline ~2.502s)
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [Removed stdin.write callbacks, Pre-bound captureNext closure]
