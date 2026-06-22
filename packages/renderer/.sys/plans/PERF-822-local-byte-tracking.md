---
id: PERF-822
slug: remove-writablelength-check
status: unclaimed
claimed_by: ""
created: 2024-05-18
completed: ""
result: ""
---

# PERF-822: Remove Redundant stream.writableLength Checking in CaptureLoop

## Focus Area
The `CaptureLoop.ts` fast paths (both single-worker and multi-worker loops). We want to remove the redundant `stream.writableLength >= 16777216` condition when awaiting the drain promise.

## Background Research
In `CaptureLoop.ts`, we are piping frame data to FFmpeg's stdin. After writing a chunk to the stream, we check if the stream is congested by checking both the return value of `stream.write()` (`writeSuccess`) AND the stream's `writableLength` property against a hardcoded 16MB threshold:

```typescript
if (!writeSuccess && stream.writableLength >= 16777216) {
    await this.drainPromise;
}
```

Node.js `Writable` streams already implement internal backpressure handling. When `stream.write()` returns `false`, it indicates that the internal buffer has reached the `highWaterMark` and we should wait for the `drain` event.

By explicitly checking `stream.writableLength >= 16777216`, we:
1. Impose a second, arbitrary threshold that may or may not match the stream's actual `highWaterMark`.
2. Incur the overhead of accessing the `writableLength` property getter on the stream object inside the hottest loop of the application.
3. Potentially cause the application to ignore backpressure if the stream's internal `highWaterMark` is lower than 16MB but `write()` still returns false.

However, since we spawn the FFmpeg process with default pipe options, Node.js assigns a default `highWaterMark` to `stdin` (typically 16KB, 64KB, or 1MB depending on the version and platform, but not 16MB). By awaiting `drain` only when `writableLength >= 16777216`, we are currently *buffering up to 16MB in Node.js memory* before we yield to the microtask queue to wait for FFmpeg.

Wait, if we remove this 16MB check, we will await `drain` much more frequently (since the default highWaterMark is lower). If we want to maintain the 16MB buffer, we should instead configure the stream's `highWaterMark` or rely entirely on Node's stream implementation.
Actually, let's keep the buffer size semantics but remove the property access overhead.
If we just remove the check entirely:
```typescript
if (!writeSuccess) {
    await this.drainPromise;
}
```
This will cause more frequent backpressure pauses, which might slow down the render, OR it might actually improve V8 scheduling by preventing Node.js from queueing up huge amounts of memory before pausing.

Wait, let's look at the journal:
"PERF-789: Tune FFmpeg Stdin Backpressure
What I tried: Lowered stdin.writableLength threshold from 16777216 (16MB) to 4194304 (4MB) in single-worker fast path.
WHY it didn't work: The median render time in the fast path slightly regressed to ~2.274s (vs baseline median ~2.069s). The tighter synchronization caused more frequent yielding to FFmpeg which created more backpressure bottlenecks than a larger buffer space. The 16MB threshold correctly buffers chunks before pausing."

So 16MB *is* the correct threshold.
BUT, the way it's implemented right now, we are buffering 16MB in memory *above* the stream's high water mark, and Node.js will continually return `false` on `stream.write()` for all those writes until it hits 16MB, at which point we finally await `drain`.
If we want to keep the 16MB buffering but avoid evaluating `stream.writableLength` every frame, we can just maintain a local accumulator integer for the bytes written since the last drain, OR we can try simply changing the child process `highWaterMark` when spawning, but unfortunately Node.js `child_process.spawn` does not easily allow configuring the `highWaterMark` of the created pipes directly through the options argument (it just takes `'pipe'`).

Actually, there is another optimization.
Is the `stream.writableLength` property access really that slow? Let's check another idea.

What about `console.log(\`Progress: Rendered ${currentFrame} / ${totalFrames} frames\`);`?
We are calling `console.log` inside the render loop every `progressInterval` frames. This involves string interpolation and IO. But it's only every N frames.

Let's look at the multi-worker loop.
```typescript
const ringIndex = nextFrameToWrite & ringMask;
if (frameReadyRing[ringIndex] === 0) {
    // We are waiting for the next frame to be ready
    await writerWaiterPromise;
    continue;
}
```
This uses an array buffer `frameReadyRing` and `writerWaiterPromise`.

Wait, what if we eliminate the `nextProgressFrame` variable and the associated progress check completely from the hot loop?
We can move the progress logging to a separate `setInterval` timer that checks the current `i` value, rather than evaluating an `if` condition on every single frame iteration.

Or, what if we replace `const maxBytes = (str.length * 3) >>> 2;` with `Buffer.byteLength(str, 'base64')`? No, PERF-799 says bypassing `Buffer.byteLength` was a win.

Let's look at `CaptureLoop.ts` where `writeSuccess` is checked:
```typescript
if (!writeSuccess && stream.writableLength >= 16777216) {
    await this.drainPromise;
}
```
If we track `writableLength` manually, we can avoid the property getter.
`let accumulatedBytes = 0;`
When we write:
`accumulatedBytes += chunk.length;`
```typescript
if (!writeSuccess) {
    if (accumulatedBytes >= 16777216) {
        await this.drainPromise;
        accumulatedBytes = 0;
    }
} else {
    accumulatedBytes = 0;
}
```
But wait, when `drain` happens, `writableLength` resets. If we manually track `accumulatedBytes`, we don't need to read `stream.writableLength`.

Let's do an experiment to track `accumulatedBytes` locally instead of reading `stream.writableLength`.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080, 60fps, 300 frames, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.831s
- **Bottleneck analysis**: Reading `stream.writableLength` accesses a getter on a Node.js Stream object, which traverses internal state (`stream.writableState.length`). Doing this 60 times a second inside the hottest inner loop adds slight V8 overhead.

## Implementation Spec

### Step 1: Replace `stream.writableLength` with a local byte counter
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. At the start of the fast paths (both single and multi-worker), declare a local variable: `let pendingBytes = 0;`
2. Every time a chunk is written to the stream, add its length to `pendingBytes`. (For strings, this is the `chunk.length`. For raw buffers, it's `buffer.length`).
3. Replace the `stream.writableLength >= 16777216` condition with `pendingBytes >= 16777216`.
4. When `await this.drainPromise;` is called, immediately reset `pendingBytes = 0;` after it resolves.

**Why**: By manually tracking the byte count in a local V8 register/variable, we avoid crossing the boundary to access the Stream object's internal state on every frame. This eliminates the property getter overhead in the hot path.

### Step 2: Implement locally in loops
For example, in the single-worker string loop:
```typescript
const written = pooled.buffer.write(str, 'base64');
const chunk = pooled.buffer.subarray(0, written);
pendingBytes += written;
writeSuccess = stream.write(chunk, pooled.freeCb);

if (!writeSuccess && pendingBytes >= 16777216) {
    await this.drainPromise;
    pendingBytes = 0;
}
```
Ensure to reset `pendingBytes = 0` after `await this.drainPromise`.

## Variations
### Variation A: Completely eliminate the 16MB threshold
If local tracking is too complex, try just entirely removing the `>= 16777216` threshold and relying purely on `!writeSuccess`. However, PERF-789 indicated this might regress performance by causing too frequent yielding.

## Canvas Smoke Test
`node -e "require('./scripts/verify-diagnostics.cjs')"` or simply `npm run build && node -e "console.log('Build passed');"` (We can use a quick custom node script to verify canvas).
