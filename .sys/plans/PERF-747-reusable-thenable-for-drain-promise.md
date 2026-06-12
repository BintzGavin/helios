---
id: PERF-747
slug: reusable-thenable-for-drain-promise
status: unclaimed
claimed_by: ""
created: 2024-06-12
completed: ""
result: ""
---

# PERF-747: ReusableThenable for Drain Promise in CaptureLoop

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - The `drainPromiseExecutor` and stream backpressure handling logic.

## Background Research
Currently in `CaptureLoop.ts`, we already optimized stream listeners by attaching them once in `setupDrainListeners`. However, when backpressure is encountered (i.e. `!canWriteMore && stdin.writableLength >= 16777216`), we still allocate a new Promise using `previousWritePromise = new Promise<void>(this.drainPromiseExecutor)`. This allocates a new Javascript Promise object and executes the executor closure.

In `PERF-746`, we successfully replaced the `writerWaiterExecutor` with a custom `ReusableThenable` class that duck-types as a standard Promise to `await` without allocating a new Javascript Promise object. This reduced heap allocations and tracking overhead.

We can apply this exact same `ReusableThenable` pattern to the stream drain wait logic.

## Benchmark Configuration
- **Composition URL**: `tests/fixtures/standard-dom.html`
- **Render Settings**: 1920x1080, 60fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: Established dynamically by Executor
- **Bottleneck analysis**: Allocating new Promises on stream backpressure causes heap growth and garbage collection. While backpressure happens infrequently, this completely eliminates the remaining `new Promise` allocations in the capture loop's execution path.

## Implementation Spec

### Step 1: Replace drain state with `ReusableThenable`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Remove the properties:
```typescript
  private drainResolve: (() => void) | null = null;
  private drainReject: ((err: Error) => void) | null = null;
  private drainPromiseExecutor = (resolve: () => void, reject: (err: Error) => void) => { this.drainResolve = resolve; this.drainReject = reject; };
```
2. Replace them with:
```typescript
  private drainPromise = new ReusableThenable();
```

### Step 2: Update `setupDrainListeners`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Update `setupDrainListeners()` to use `this.drainPromise.resolve()` and `this.drainPromise.reject(err)`:
```typescript
  private setupDrainListeners() {
    if (!this.ffmpegManager.stdin) return;
    this.ffmpegManager.stdin.on('drain', () => {
      this.drainPromise.resolve();
    });
    this.ffmpegManager.stdin.on('error', (err) => {
      if (err && (err as any).code === 'EPIPE') {
         console.warn('FFmpeg stdin closed prematurely (EPIPE). Ignoring error to allow graceful exit.');
         this.drainPromise.resolve();
      } else {
        if (this.drainPromise.rejectCb) {
          this.drainPromise.reject(err);
        } else {
          this.ffmpegManager.emitError(err);
        }
      }
    });
    this.ffmpegManager.stdin.on('close', () => {
      if (this.drainPromise.rejectCb) {
        this.drainPromise.reject(new Error('FFmpeg stdin closed before drain'));
      }
    });
  }
```

### Step 3: Replace `new Promise` with `this.drainPromise`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Find all occurrences of `previousWritePromise = new Promise<void>(this.drainPromiseExecutor);` (in both single worker and multi worker paths) and replace them with:
```typescript
previousWritePromise = this.drainPromise as any as Promise<void>;
```

Find the final flush await:
```typescript
          if (!canWriteMore) {
              await new Promise<void>(this.drainPromiseExecutor);
          }
```
Replace with:
```typescript
          if (!canWriteMore) {
              await this.drainPromise;
          }
```

**Why**: By using a single `ReusableThenable` object across the entire stream pipeline, we completely eliminate the allocation of `new Promise` objects every time the stream buffers fill up. This reduces garbage collection pressure.
**Risk**: Negligible. The event listeners are permanent and the `ReusableThenable` safely handles resets after resolving.

## Correctness Check
- Run the standard test suite to ensure the stream correctly waits for drain without hanging or throwing unhandled rejections.

## Prior Art
- PERF-746 successfully eliminated Promise allocation for the writer wait loop using `ReusableThenable`.
- PERF-742 eliminated Promise allocation in CdpTimeDriver.
