---
id: PERF-253
slug: optimize-capture-loop-write
status: unclaimed
claimed_by: ""
created: "2026-04-12"
completed: ""
result: ""
---

# PERF-253: Optimize Capture Loop Write To Stdin Callback Closure

## Focus Area
DOM Rendering Pipeline - Hot Loop in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
During the `CaptureLoop.run()` execution, the `onWriteError` callback is dynamically allocated inside the loop execution path. V8 garbage collection can be improved by pre-binding such callbacks. By extracting `onWriteError` into an arrow function class property, we eliminate closure allocations inside the hot loop.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition
- **Render Settings**: 1920x1080, 60fps, 10s duration, libx264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.2s
- **Bottleneck analysis**: V8 garbage collection in the hot rendering loop from closure allocation.

## Implementation Spec

### Step 1: Pre-bind `onWriteError`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Add a class property to `CaptureLoop`:
```typescript
  private handleWriteError = (err?: Error | null) => {
    if (err) {
      if ((err as any).code === 'EPIPE') {
        console.warn('FFmpeg stdin closed prematurely during write (EPIPE). Ignoring error to allow graceful exit.');
      } else {
        this.ffmpegManager.emitError(err);
      }
    }
  };
```
And remove the `onWriteError` inside `run()`, replacing `onWriteError` usages with `this.handleWriteError`.

**Why**: Eliminates closure allocation per frame inside the hot loop.
**Risk**: Negligible. Context is already correctly bound using the arrow function class property.

## Correctness Check
Run the canvas test and dom test.
