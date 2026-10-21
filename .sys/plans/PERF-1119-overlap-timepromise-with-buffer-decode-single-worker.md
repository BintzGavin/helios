---
id: PERF-1119
slug: overlap-timepromise-with-buffer-decode-single-worker
status: unclaimed
claimed_by: ""
created: 2024-10-21
completed: ""
result: ""
---

# PERF-1119: Overlap timePromise await with Buffer Decode in Single-Worker Setup

## Focus Area
The single-worker fast path chunk loop logic in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
Currently in the `isDomStrategy` paths for the single-worker setup, inside the chunk loop we have this sequence:

```typescript
              const rawResult = await nextCapturePromise;

              const timePromise = timeDriver.setTime(
                page,
                (startFrame + i + 1) * compTimeStep,
              );
              if (timePromise) await timePromise;

              if (!aborted) {
                nextCapturePromise = domBeginFrame!((i + 1) * timeStep);
              }

              domLastFrameBuffer = Buffer.from(rawResult as string, "base64");
              const buf = domLastFrameBuffer!;

              pendingBytes += buf.length;
              if (!stream.write(buf) && pendingBytes >= 16777216) {
                await this.drainPromise;
                pendingBytes = 0;
              }
```

Notice the order of operations:
1. Await `nextCapturePromise` to get `rawResult`.
2. Dispatch `timeDriver.setTime` (a network-bound CDP call) and immediately `await timePromise`.
3. After the time seek completes, dispatch `domBeginFrame` (non-blocking).
4. Synchronously decode the base64 string `Buffer.from(rawResult)` (CPU-bound) and write to stream.

By `await`ing `timePromise` immediately after dispatching it, Node.js blocks and waits idly for the Chromium engine to seek the timeline. The synchronous `Buffer.from` operation and stream write happen afterward.

If we move the synchronous `Buffer.from(rawResult)` and `stream.write` to execute *between* dispatching `timeDriver.setTime` and `await timePromise`, we can overlap the Node.js CPU-bound base64 decoding with the browser's network-bound timeline seek evaluation.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.701s
- **Bottleneck analysis**: The Node.js thread sits idle while awaiting `timePromise`, then spends CPU cycles decoding base64 synchronously after the browser finishes seeking. Overlapping these tasks maximizes concurrency.

## Implementation Spec

### Step 1: Overlap `Buffer.from` with `timePromise` in single-worker chunk loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategy` chunk loop (`while (i < totalFrames - 1 && !aborted)`), reorder the operations to perform decoding *while* the `timePromise` is pending:

Change:
```typescript
              const rawResult = await nextCapturePromise;

              const timePromise = timeDriver.setTime(
                page,
                (startFrame + i + 1) * compTimeStep,
              );
              if (timePromise) await timePromise;

              if (!aborted) {
                nextCapturePromise = domBeginFrame!((i + 1) * timeStep);
              }

              domLastFrameBuffer = Buffer.from(rawResult as string, "base64");
              const buf = domLastFrameBuffer!;

              pendingBytes += buf.length;
              if (!stream.write(buf) && pendingBytes >= 16777216) {
                await this.drainPromise;
                pendingBytes = 0;
              }
```

To:
```typescript
              const rawResult = await nextCapturePromise;

              const timePromise = timeDriver.setTime(
                page,
                (startFrame + i + 1) * compTimeStep,
              );

              // Eagerly process CPU-bound string decoding and stream write while Chromium handles time seek
              domLastFrameBuffer = Buffer.from(rawResult as string, "base64");
              pendingBytes += domLastFrameBuffer.length;
              const writeSuccess = stream.write(domLastFrameBuffer);

              if (timePromise) await timePromise;

              if (!aborted) {
                nextCapturePromise = domBeginFrame!((i + 1) * timeStep);
              }

              if (!writeSuccess && pendingBytes >= 16777216) {
                await this.drainPromise;
                pendingBytes = 0;
              }
```

### Step 2: Apply the same overlap to the single-worker initial block
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single worker `isDomStrategy` initialization block (the `if (1 < totalFrames)` section):

Change:
```typescript
            if (1 < totalFrames) {
              const timePromise = timeDriver.setTime(
                page,
                (startFrame + 1) * compTimeStep,
              );
              if (timePromise) await timePromise;
              nextCapturePromise = domBeginFrame!(timeStep);
            }
            console.log(`Progress: Rendered 0 / ${totalFrames} frames`);
            if (onProgress) {
              onProgress(0 / totalFrames);
            }

            domLastFrameBuffer = Buffer.from(rawResult as string, "base64");

            pendingBytes += domLastFrameBuffer!.length;
            if (!stream.write(domLastFrameBuffer!) && pendingBytes >= 16777216) {
```

To:
```typescript
            let writeSuccess = true;
            if (1 < totalFrames) {
              const timePromise = timeDriver.setTime(
                page,
                (startFrame + 1) * compTimeStep,
              );

              // Eagerly decode and write while waiting for time seek
              domLastFrameBuffer = Buffer.from(rawResult as string, "base64");
              pendingBytes += domLastFrameBuffer.length;
              writeSuccess = stream.write(domLastFrameBuffer);

              if (timePromise) await timePromise;
              nextCapturePromise = domBeginFrame!(timeStep);
            } else {
              domLastFrameBuffer = Buffer.from(rawResult as string, "base64");
              pendingBytes += domLastFrameBuffer.length;
              writeSuccess = stream.write(domLastFrameBuffer);
            }

            console.log(`Progress: Rendered 0 / ${totalFrames} frames`);
            if (onProgress) {
              onProgress(0 / totalFrames);
            }

            if (!writeSuccess && pendingBytes >= 16777216) {
              await this.drainPromise;
              pendingBytes = 0;
            }
```

**Why**: By dispatching `timeDriver.setTime()` first, and then performing the synchronous `Buffer.from` decode before `await timePromise`, we prevent blocking the main thread *before* the CDP command is dispatched, guaranteeing concurrent execution of the CPU-bound operation and the browser's time seek evaluation.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to ensure canvas path rendering remains completely unaffected.

## Correctness Check
Run `npx tsx scripts/benchmark-perf.ts --mode=dom` inside `packages/renderer` to verify DOM frame rendering does not hang and finishes cleanly.
