---
id: PERF-589
slug: inline-ffmpeg-stdin-writes
status: unclaimed
claimed_by: ""
created: 2024-05-25
completed: ""
result: ""
---

# PERF-589: Inline FFmpeg stdin writes in CaptureLoop

## Focus Area
DOM Rendering Pipeline - Output buffer writing loop in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
In `CaptureLoop.ts`, the frame data is currently piped to FFmpeg via `this.writeToStdin(buffer, this.handleWriteError)`, where `writeToStdin` handles both strings (base64) and raw Buffers, determines writeability, and optionally returns a drain Promise.
The overhead of invoking `writeToStdin` and returning/handling this mixed state for every frame inside the final synchronization `while` loop can be avoided by directly calling `this.ffmpegManager.stdin.write()` inline. Since the type of `buffer` (either string or Buffer) is known within `writeToStdin` but must be re-checked dynamically on every call, we can optimize this hot path. The V8 JIT compiler can optimize direct property access and `write` calls significantly better than a wrapper function returning an optional Promise, particularly since most intermediate frames will likely be Strings (Base64 from CDP) or pre-allocated Buffers.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition (`examples/dom-benchmark`)
- **Render Settings**: 600x600, 30fps, 5s duration, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.298s
- **Bottleneck analysis**: Function call overhead and dynamic type checking during the high-frequency buffer write loop in `CaptureLoop.ts`.

## Implementation Spec

### Step 1: Inline `writeToStdin` logic directly into the frame processing loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `CaptureLoop.ts`, remove the `writeToStdin` method entirely.
Inside the `try` block for writing frames:
```typescript
            if (previousWritePromise) {
                await previousWritePromise;
            }

            const writeResult = this.writeToStdin(buffer, this.handleWriteError);
            previousWritePromise = writeResult ? writeResult : undefined;
```

Replace it with the directly inlined logic:
```typescript
            if (previousWritePromise) {
                await previousWritePromise;
                previousWritePromise = undefined;
            }

            if (this.ffmpegManager.stdin?.writable) {
                let canWriteMore: boolean;
                if (typeof buffer === 'string') {
                    canWriteMore = this.ffmpegManager.stdin.write(buffer, 'base64', this.handleWriteError);
                } else {
                    canWriteMore = this.ffmpegManager.stdin.write(buffer, this.handleWriteError);
                }

                if (!canWriteMore) {
                    previousWritePromise = new Promise<void>(this.drainPromiseExecutor);
                }
            } else {
                console.warn('FFmpeg stdin is not writable. Skipping write.');
            }
```

And similarly inline it for the `finalBuffer` write at the end of the `run` method:
```typescript
    if (finalBuffer && ((Buffer.isBuffer(finalBuffer) && finalBuffer.length > 0) || (typeof finalBuffer === 'string' && finalBuffer.length > 0))) {
      console.log(`Writing final buffer...`);
      const writeResult = this.writeToStdin(finalBuffer, this.handleWriteError);
      if (writeResult) await writeResult;
    }
```

Replace it with:
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

**Why**: Avoids the wrapper function call `writeToStdin` and the optional Promise return assignment overhead on every single frame.

## Correctness Check
Execute the renderer benchmark to verify the video outputs correctly without dropped frames or pipeline deadlocks.
