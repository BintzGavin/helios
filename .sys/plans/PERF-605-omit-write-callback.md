---
id: PERF-605
slug: omit-write-callback
status: complete
claimed_by: "Jules"
created: 2024-05-28
completed: 2024-05-28
result: "discard"
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

## Results Summary
```
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	1.346	150	111.42	69.9	discard	omit write callback
2	1.327	150	113.06	70.1	discard	omit write callback
3	1.341	150	111.89	70.1	discard	omit write callback
```
