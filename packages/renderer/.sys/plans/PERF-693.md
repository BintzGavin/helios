---
status: complete
completed: 2024-06-06
result: improved
claimed_by: "executor-session"
---

# PERF-693: Omit write callbacks in CaptureLoop fast path

**Intent**: In `CaptureLoop.ts`, specifically in the single-worker fast path, we currently pass `this.handleWriteError` as a callback to `stdin.write`:
```typescript
                    if (typeof buffer === 'string') {
                        canWriteMore = stdin.write(buffer, 'base64', this.handleWriteError);
                    } else {
                        canWriteMore = stdin.write(buffer, this.handleWriteError);
                    }
```
Passing an error callback on every frame write causes Node.js stream internals to allocate and track state machine logic for each individual chunk write. Since FFmpeg's `stdin` stream already emits `'error'` events if the process dies or the pipe breaks, and since `this.handleWriteError` just intercepts that specific write chunk's error (which is exceedingly rare compared to stream-level errors), we can drop the callback entirely to avoid the internal tracking overhead in the hot loop.

## The Benchmark Harness

Standard 3-run median, check `render_time_s`.

## Results Summary
- **Best render time**: 2.347s (vs baseline 2.471s)
- **Improvement**: 5.0%
- **Kept experiments**: Omit write callbacks in CaptureLoop fast path
- **Discarded experiments**: None
