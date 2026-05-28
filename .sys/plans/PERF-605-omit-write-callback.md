---
id: PERF-605
slug: omit-write-callback
status: unclaimed
claimed_by: ""
created: 2024-05-28
completed: ""
result: ""
---

# PERF-605: Omit write callback in FFmpeg stdin writes

## Focus Area
DOM Rendering Pipeline - Output writing phase in `packages/renderer/src/core/CaptureLoop.ts` and `FFmpegManager.ts`.

## Background Research
Currently, the `CaptureLoop` passes a callback (`this.handleWriteError`) to every `this.ffmpegManager.stdin.write(buffer, ..., callback)` call to handle potential write errors like `EPIPE`.
In Node.js streams, passing a callback to `.write()` forces the internal `Writable` state machine to allocate a tracking object (e.g., `WriteReq`) on the heap to execute the callback when the specific chunk is fully flushed. Doing this 60 times a second creates unnecessary garbage collection pressure and main-thread CPU overhead.
By completely omitting the callback, Node.js takes a much faster path for queuing chunks. We can preserve the exact same error-handling semantics by relying on the `'error'` event listener that is already attached to `stdin` in `FFmpegManager.ts`, and simply invoking `this.emitError(err)` from there.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition (`examples/dom-benchmark`)
- **Render Settings**: Standard benchmark settings
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.267s
- **Bottleneck analysis**: Node.js `Writable.write` internal object allocation overhead for tracking per-chunk callbacks.

## Implementation Spec

### Step 1: Remove `handleWriteError` from `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Delete the `handleWriteError` method entirely.
2. In the `run` loop, change:
```typescript
                if (typeof buffer === 'string') {
                    canWriteMore = this.ffmpegManager.stdin.write(buffer, 'base64', this.handleWriteError);
                } else {
                    canWriteMore = this.ffmpegManager.stdin.write(buffer, this.handleWriteError);
                }
```
to:
```typescript
                if (typeof buffer === 'string') {
                    canWriteMore = this.ffmpegManager.stdin.write(buffer, 'base64');
                } else {
                    canWriteMore = this.ffmpegManager.stdin.write(buffer);
                }
```
3. Instruct the executor to explore the full code block near the end of `run()` handling the `finalBuffer` write and remove the `this.handleWriteError` callback in the same manner.

### Step 2: Handle errors centrally in `FFmpegManager.ts`
**File**: `packages/renderer/src/core/FFmpegManager.ts`
**What to change**:
Instruct the executor to explore the `spawn()` function and locate the `this.process.stdin.on('error', ...)` handler block. When the error is not `EPIPE`, the handler should be updated to invoke `this.emitError(err)` to replace the removed logic from `handleWriteError`.

## Variations
No variations planned. The primary approach is straightforward and directly targets the Node.js Writable stream optimization path.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts` to ensure Canvas mode still renders cleanly without stream write errors.

## Correctness Check
Run the `npm run test -w packages/renderer` to verify output correctly retains all frames and avoids truncation, ensuring error handling logic is not broken.

## Prior Art
Builds on findings from PERF-597 and PERF-603 regarding FFmpeg stdin write overhead and stream optimization techniques.