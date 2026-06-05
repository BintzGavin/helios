---
id: PERF-680
slug: eliminate-pre-bound-executor
status: complete
claimed_by: ""
created: 2025-05-26
completed: ""
result: failed
---

# PERF-680: Eliminate Pre-Bound Writer Waiter Executor

## Focus Area
The hot loop in `CaptureLoop.ts` where the main writer loop waits for frames to become ready.

## Background Research
In the multi-worker actor model loop, `writerWaiterExecutor` is allocated once:
```typescript
    let writerWaiterResolve: (() => void) | null = null;
    const writerWaiterExecutor = (resolve: () => void) => { writerWaiterResolve = resolve; };
```
And then used in the `run()` loop:
```typescript
            const ringIndex = nextFrameToWrite & ringMask;
            if (frameReadyRing[ringIndex] === 0) {
                await new Promise<void>(writerWaiterExecutor);
                continue;
            }
```

V8 executes `new Promise<void>(writerWaiterExecutor)` by invoking the executor immediately and synchronously. While we statically allocate `writerWaiterExecutor` to avoid inline closures, V8 must still allocate the Promise object, setup the internal execution context, and map the `resolve` capability out to our outer closure on every single wait iteration.

Inlining Promise executors directly within the promise constructor, rather than using a pre-allocated function reference, can sometimes improve V8's ability to optimize the allocation context within `async` / `await` generator loops. V8 efficiently handles block-scoped closures inside asynchronous loops, avoiding the overhead of external reference lookup and context switching. By inlining the executor, we allow the JIT compiler to optimize the closure natively inside the tight loop context.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition
- **Render Settings**: Same resolution, FPS, duration, codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.127s (from PERF-678)
- **Bottleneck analysis**: The writer loop in `CaptureLoop.ts` awaits a promise when a frame is not ready. The promise uses a pre-allocated executor function `writerWaiterExecutor`.

## Implementation Spec

### Step 1: Inline `writerWaiterExecutor`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Remove the `writerWaiterExecutor` function definition around line 97:
`const writerWaiterExecutor = (resolve: () => void) => { writerWaiterResolve = resolve; };`

Update the promise creation in the writer loop (around line 220) to use an inline executor:
Change `await new Promise<void>(writerWaiterExecutor);`
To `await new Promise<void>(resolve => { writerWaiterResolve = resolve; });`

**Why**: This eliminates the use of a pre-allocated external closure, allowing V8 to optimize the inline promise executor within the current execution block, potentially reducing context-switching latency.
**Risk**: Negligible risk; it is functionally identical but relies on V8's optimization heuristics.

## Canvas Smoke Test
Run a basic Canvas smoke test to ensure the fallback pipeline is not broken.

## Correctness Check
Verify that the output DOM video is fully rendered and identical in length and content.

## Results Summary
- **Best render time**: 2.375s (vs baseline ~2.127s)
- **Improvement**: Regressed
- **Kept experiments**: None
- **Discarded experiments**: Inline writerWaiterExecutor in CaptureLoop
