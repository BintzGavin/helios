---
id: PERF-679
slug: eliminate-writer-waiter-executor
status: unclaimed
claimed_by: ""
created: 2024-06-05
completed: ""
result: ""
---

# PERF-679: Eliminate Writer Waiter Executor Closure in CaptureLoop

## Focus Area
DOM Rendering Pipeline - Hot Loop in `packages/renderer/src/core/CaptureLoop.ts`.

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

V8 executes `new Promise<void>(writerWaiterExecutor)` by invoking the executor immediately and synchronously, passing it the internal `resolve` function. While we statically allocate `writerWaiterExecutor`, V8 must still allocate the Promise object, the internal execution context for the executor, and map the `resolve` capability out to our outer closure on every single wait iteration.

By explicitly creating an inverted Promise wrapper, we could manage the Promise lifecycle slightly differently, or use a basic sleep fallback. However, a simpler optimization within standard Promise limits is to inline the executor directly `await new Promise<void>(resolve => { writerWaiterResolve = resolve; });`. If V8 is more efficient at handling inline Promise executors in ES6+ rather than referenced closures, this may yield a micro-optimization. Even better, replacing the Promise with a lightweight `yield` or `setImmediate` fallback would avoid Promise allocation entirely, but that alters loop behavior.

Hypothesis: Inlining the executor `resolve => { writerWaiterResolve = resolve; }` might allow V8's JIT to optimize the Promise creation better than a reference to a closed-over `const` function, because the inline function directly accesses the local block scope context rather than chaining contexts. Let's test if V8 handles `await new Promise<void>(resolve => writerWaiterResolve = resolve)` faster than `await new Promise<void>(writerWaiterExecutor)`.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.049s - 2.077s
- **Bottleneck analysis**: Allocation and context-switching overhead for Promise executors in the inner tight write loop.

## Implementation Spec

### Step 1: Inline the writer waiter executor
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Remove `const writerWaiterExecutor = (resolve: () => void) => { writerWaiterResolve = resolve; };`
2. Update the wait condition:
```typescript
<<<<<<< SEARCH
            if (frameReadyRing[ringIndex] === 0) {
                await new Promise<void>(writerWaiterExecutor);
                continue;
            }
=======
            if (frameReadyRing[ringIndex] === 0) {
                await new Promise<void>(resolve => { writerWaiterResolve = resolve; });
                continue;
            }
>>>>>>> REPLACE
```

**Why**: Removes a local const function reference overhead. Allows V8's JIT to optimize the inline executor function execution in the hot loop directly without traversing a closure reference scope.
**Risk**: Negligible. Functionally identical.

## Variations
None.

## Canvas Smoke Test
Run a canvas test to ensure no breaking changes in CaptureLoop structure.

## Correctness Check
Run the DOM render benchmark `cd packages/renderer && npx tsx scripts/benchmark-perf.ts` and verify output integrity.
