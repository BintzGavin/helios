---
id: PERF-589
slug: inline-ffmpeg-stdin-writes
status: unclaimed
claimed_by: ""
created: 2026-10-31
completed: ""
result: ""
---
# PERF-589: Inline FFmpeg stdin writes in CaptureLoop

## Focus Area
The write operation to FFmpeg's `stdin` inside the CaptureLoop hot loop. Replacing the separate `writeToStdin` method with direct inline `this.ffmpegManager.stdin.write` calls.

## Background Research
Currently, `CaptureLoop.ts` calls `this.writeToStdin(buffer, this.handleWriteError)` inside its hot loop. This method handles two types of buffers (Buffer and string) and conditionally returns a Promise if `stdin.write` returns `false` indicating backpressure. The overhead of calling a separate method, evaluating conditions for the buffer type, and handling optional Promise returns in V8 can introduce micro-delays inside the `while` loop that writes frames. By inlining this exact behavior directly into the `CaptureLoop.ts` hot loop, we eliminate method invocation overhead and closure generation in V8.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition (`examples/dom-benchmark`)
- **Render Settings**: 600x600, 30fps, 5s duration, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.345s
- **Bottleneck analysis**: Microtask queue scheduling overhead from function dispatches and promise wrapping inside the frame writing loop.

## Implementation Spec

### Step 1: Inline `writeToStdin` inside `CaptureLoop.ts` `run()`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Remove the `writeToStdin` method entirely from the `CaptureLoop` class.
2. Inside `run()`, in the hot loop (around line 252):
```typescript
            let writeResult: Promise<void> | undefined;
            if (this.ffmpegManager.stdin?.writable) {
                let canWriteMore: boolean;
                if (typeof buffer === 'string') {
                    canWriteMore = this.ffmpegManager.stdin.write(buffer, 'base64', this.handleWriteError);
                } else {
                    canWriteMore = this.ffmpegManager.stdin.write(buffer, this.handleWriteError);
                }
                if (!canWriteMore) {
                    writeResult = new Promise<void>(this.drainPromiseExecutor);
                }
            } else {
                console.warn('FFmpeg stdin is not writable. Skipping write.');
            }
            previousWritePromise = writeResult ? writeResult : undefined;
```
Replace the existing `const writeResult = this.writeToStdin(...)` and `previousWritePromise = ...` lines with the logic above.
3. Update the final flush out of the loop (around line 283):
```typescript
    if (finalBuffer && ((Buffer.isBuffer(finalBuffer) && finalBuffer.length > 0) || (typeof finalBuffer === 'string' && finalBuffer.length > 0))) {
      console.log(`Writing final buffer...`);
      if (this.ffmpegManager.stdin?.writable) {
        let canWriteMore: boolean;
        if (typeof finalBuffer === 'string') {
            canWriteMore = this.ffmpegManager.stdin.write(finalBuffer, 'base64', this.handleWriteError);
        } else {
            canWriteMore = this.ffmpegManager.stdin.write(finalBuffer, this.handleWriteError);
        }
        if (!canWriteMore) {
            await new Promise<void>(this.drainPromiseExecutor);
        }
      } else {
          console.warn('FFmpeg stdin is not writable. Skipping write.');
      }
    }
```
Replace the existing `const writeResult = this.writeToStdin(finalBuffer, this.handleWriteError);` and `if (writeResult) await writeResult;` logic with the code above.
**Why**: Avoids function call dispatch overhead and simplifies V8 inline optimization for the hot loop path.
**Risk**: Minimal. Behavior is identical.

## Canvas Smoke Test
Run `npm run test -w packages/renderer -- --run` to ensure changes don't break Canvas compilation.

## Correctness Check
Verify output video still produces the correct number of frames without truncating or locking.
