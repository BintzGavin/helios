---
id: PERF-664
slug: inline-writer-waiter-resolve
status: complete
claimed_by: "executor"
created: 2024-06-03
completed: 2024-06-03
result: "no-improvement"
---

# PERF-664: Inline Writer Waiter Resolve Call to Bypass Null Reassignment

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - `runWorker` and `checkState`

## Background Research
In the hot loop of `CaptureLoop.ts` (`runWorker`), the writer waiter is awoken via:
```typescript
            if (writerWaiterResolve) {
                const res = writerWaiterResolve;
                writerWaiterResolve = null;
                res();
            }
```
This requires a variable allocation for `res`, assigning `null` to `writerWaiterResolve`, and then invoking `res()`.
We also do the same in `checkState`.

While assigning `null` here helps garbage collect the old `resolve` function reference inside `writerWaiterResolve`, we can invoke it immediately and then nullify it, bypassing the intermediate `res` variable allocation.
```typescript
            if (writerWaiterResolve) {
                writerWaiterResolve();
                writerWaiterResolve = null;
            }
```
This is computationally simpler in V8 bytecode and avoids creating a new block-scoped variable in the hottest execution path.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.646s
- **Bottleneck analysis**: Micro-allocations inside the hottest loop in `CaptureLoop.ts`.

## Implementation Spec

### Step 1: Inline `writerWaiterResolve` execution
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In `runWorker()`, replace:
```typescript
            if (writerWaiterResolve) {
                const res = writerWaiterResolve;
                writerWaiterResolve = null;
                res();
            }
```
with:
```typescript
            if (writerWaiterResolve) {
                writerWaiterResolve();
                writerWaiterResolve = null;
            }
```
Also, do exactly the same replacement in `checkState()`:
```typescript
            if (writerWaiterResolve) {
                const res = writerWaiterResolve;
                writerWaiterResolve = null;
                res();
            }
```
with:
```typescript
            if (writerWaiterResolve) {
                writerWaiterResolve();
                writerWaiterResolve = null;
            }
```

**Why**: Removes a block-scoped variable allocation (`res`) on the hot path while maintaining identical garbage collection and execution behavior.
**Risk**: Functionally identical. No risk.

## Variations
None.

## Correctness Check
Run the DOM render benchmark script (`npx tsx packages/renderer/scripts/benchmark-perf.ts`) to ensure it produces valid outputs without regressions.

## Prior Art
- PERF-637 (Optimized writer waiter resolve condition)
