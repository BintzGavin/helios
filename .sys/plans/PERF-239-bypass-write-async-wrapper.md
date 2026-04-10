---
id: PERF-239
slug: bypass-write-async-wrapper
status: complete
claimed_by: ""
created: "$(date -I)"
completed: "2026-04-10"
result: "keep"
---

# PERF-239: Bypass writeToStdin Async Wrapper

## Focus Area
The `writeToStdin` method and its usage inside the hot frame capture loop in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
Currently, the `writeToStdin` method is declared as an `async` function. In V8, any function declared as `async` will always wrap its return value in a `Promise`, even if it returns synchronously.

Inside the `CaptureLoop.ts` hot loop, we write frames to FFmpeg's `stdin` using this method:
```typescript
        if (previousWritePromise) {
           await previousWritePromise;
        }

        previousWritePromise = this.writeToStdin(buffer, onWriteError);
```
Because `writeToStdin` is `async`, it *always* returns a Promise. Therefore, `previousWritePromise` is always truthy, meaning the very next loop iteration will *always* `await previousWritePromise`.

Since FFmpeg is spawned with a large `-thread_queue_size` (1024), `this.ffmpegManager.stdin.write()` typically returns `true` (meaning it is not backpressured). The `writeToStdin` method completes its logic synchronously in the fast-path. However, because it returns a V8 Promise, the hot loop is forced to yield to the microtask queue twice per frame (once for `framePromises[i]`, and once for `previousWritePromise`), adding significant event-loop context switching overhead and latency.

By changing `writeToStdin` to return `void | Promise<void>` and omitting the `async` keyword, it can return `void` on the synchronous fast-path. This will leave `previousWritePromise` as falsy, allowing the hot loop to bypass the redundant `await` and stay in the active execution context.

## Benchmark Configuration
- **Composition URL**: Tests fixture / default benchmark
- **Render Settings**: Standard DOM render
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.7 seconds
- **Bottleneck analysis**: Microtask queue yielding and V8 Promise allocation per frame in the pipeline write step.

## Implementation Spec

### Step 1: Remove `async` from `writeToStdin`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Change the signature of `writeToStdin`:
```typescript
  private writeToStdin(buffer: Buffer | string, onWriteError: (err?: Error | null) => void): Promise<void> | void {
```
Update the method body so that instead of using `await new Promise(...)`, it returns the Promise when `!canWriteMore`:
```typescript
    if (!canWriteMore) {
        return new Promise<void>((resolve, reject) => {
            this.drainResolve = resolve;
            this.drainReject = reject;
        });
    }
```
Ensure there is no explicit `return;` needed at the end if `canWriteMore` is true, as it implicitly returns `void`.

### Step 2: Conditionally await the write result
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `run()` method, update the invocation inside the while loop:
```typescript
        const writeResult = this.writeToStdin(buffer, onWriteError);
        previousWritePromise = writeResult ? writeResult : undefined;
```
And at the end of the `run()` method, for the final buffer:
```typescript
    if (finalBuffer && ((Buffer.isBuffer(finalBuffer) && finalBuffer.length > 0) || (typeof finalBuffer === 'string' && finalBuffer.length > 0))) {
      console.log(`Writing final buffer...`);
      const writeResult = this.writeToStdin(finalBuffer, onWriteError);
      if (writeResult) await writeResult;
    }
```
**Why**: This avoids assigning a truthy value to `previousWritePromise` when the write was synchronous, preventing the next loop iteration from yielding to the microtask queue unnecessarily.
**Risk**: If `writeToStdin` correctly handles the `drain` event for backpressure, there is no functional risk. This only avoids a redundant await for an already completed synchronous operation.

## Correctness Check
Ensure the generated DOM video still has the correct number of frames and audio sync, verifying that we don't accidentally drop frames during backpressure.

## Canvas Smoke Test
Run the standard Canvas verification test (e.g., using `tests/verify-canvas-strategy.ts` or a Canvas export) to ensure shared logic is unaffected.

## Prior Art
- PERF-238: Eliminate `async` wrappers in DOM render hot path
- PERF-198: Optimized FFmpeg stream throughput by increasing `-thread_queue_size`
