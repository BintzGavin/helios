---
id: PERF-421
slug: prebind-capture-loop-executors
status: unclaimed
claimed_by: ""
created: 2024-05-02
completed: ""
result: ""
---

# PERF-421: Prebind Promise Executors in CaptureLoop writeToStdin

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - `writeToStdin` drain promise logic.

## Background Research
In the `CaptureLoop.ts` hot loop, which coordinates the pipeline from Playwright to FFmpeg, the `writeToStdin` method occasionally needs to block and wait for the FFmpeg stdin stream to drain if backpressure builds up (i.e., `stdin.write()` returns `false`).

When this happens, it allocates a new `Promise` with an inline executor function:
```typescript
    if (!canWriteMore) {
        return new Promise<void>((resolve, reject) => {
            this.drainResolve = resolve;
            this.drainReject = reject;
        });
    }
```

In previous performance experiments (like `PERF-383`, `PERF-337`, `PERF-340`), we established that pre-binding these executor functions (instead of declaring them inline as arrow functions per-frame) reduces V8 Garbage Collection overhead. Since `writeToStdin` can be called 60 times a second and might frequently hit backpressure under heavy load, eliminating this micro-allocation is a consistent application of our established "winner takes all" V8 optimization strategy.

By declaring a pre-bound `drainPromiseExecutor` on the `CaptureLoop` class, we eliminate the inline arrow function allocation entirely.

## Benchmark Configuration
- **Mode**: `dom` (or any mode, as `CaptureLoop` is shared)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Micro-allocation of `(resolve, reject) => { ... }` inline closure inside `writeToStdin` when encountering stream backpressure.

## Implementation Spec

### Step 1: Prebind `drainPromiseExecutor`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Declare a new private class property for the pre-bound executor:
```typescript
<<<<<<< SEARCH
  private drainResolve: (() => void) | null = null;
  private drainReject: ((err: Error) => void) | null = null;
=======
  private drainResolve: (() => void) | null = null;
  private drainReject: ((err: Error) => void) | null = null;
  private drainPromiseExecutor = (resolve: () => void, reject: (err: Error) => void) => {
      this.drainResolve = resolve;
      this.drainReject = reject;
  };
>>>>>>> REPLACE
```

### Step 2: Use `drainPromiseExecutor` in `writeToStdin`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Replace the inline arrow function with the pre-bound property:
```typescript
<<<<<<< SEARCH
    if (!canWriteMore) {
        return new Promise<void>((resolve, reject) => {
            this.drainResolve = resolve;
            this.drainReject = reject;
        });
    }
=======
    if (!canWriteMore) {
        return new Promise<void>(this.drainPromiseExecutor);
    }
>>>>>>> REPLACE
```

**Why**: Reusing a single prebound executor function avoids dynamically allocating a new arrow function closure on frames where backpressure occurs. This reduces GC pressure in the main event loop and aligns with prior optimizations.

## Variations
None.

## Correctness Check
Run `npx tsx tests/verify-dom-strategy-capture.ts` (or equivalent standard pipeline test) to ensure backpressure and draining still function correctly without locking up.
