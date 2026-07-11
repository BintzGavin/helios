---
id: PERF-971
slug: remove-dead-is-dom-strategy-multi-worker
status: unclaimed
claimed_by: ""
created: 2024-07-10
completed: ""
result: ""
---

# PERF-971: Remove dead isDomStrategy branch in multi-worker hasProcessFn path

## Focus Area
The multi-worker loop in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, the nested `if (isDomStrategy)` check inside the `if (hasProcessFn)` block.

## Background Research
In `packages/renderer/src/core/CaptureLoop.ts`, the multi-worker loop starts around line 715:
```typescript
        const hasProcessFn = !!strategy.processCaptureResult;

        const isDomStrategy = !!(strategy as any).beginFrameParams;
```

It then branches based on `hasProcessFn`:
```typescript
        if (hasProcessFn) {
          if (isDomStrategy) {
            // DEAD CODE!
```

`DomStrategy` does not define `processCaptureResult`. Therefore, if `isDomStrategy` is true, `hasProcessFn` must be false. (And conversely, if `hasProcessFn` is true, it is not the `DomStrategy`).

The entire `if (isDomStrategy)` block nested inside `if (hasProcessFn)` in the multi-worker path is mathematically unreachable dead code. We successfully performed this exact same dead code elimination for the single-worker path in PERF-907 and PERF-961.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard
- **Mode**: `dom` (multi worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The V8 parser and JIT compiler evaluate and parse unreachable AST branches, inflating bytecode size and reducing instruction cache density.

## Implementation Spec

### Step 1: Remove dead `if (isDomStrategy)` branch in multi-worker `hasProcessFn`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker section (after `if (poolLen === 1)` block finishes, inside the `else`), find:

```typescript
        if (hasProcessFn) {
          if (isDomStrategy) {
             // ... ~40 lines of code ...
             // writerWaiterPromise.resolve();
             // }
          } else {
            let maxSubmits = nextFrameToWrite + maxPipelineDepth;
```
Remove the `if (isDomStrategy) { ... } else {` wrapper, unconditionally executing the `else` block contents when `hasProcessFn` is true.

```typescript
        if (hasProcessFn) {
            let maxSubmits = nextFrameToWrite + maxPipelineDepth;
            while (!aborted && nextFrameToSubmit < totalFrames) {
              // ...
```

**Why**: By completely removing this unreachable block, we decrease the V8 parser overhead, shrink the AST, and eliminate an unnecessary boolean check from the engine's perspective. It maintains logical correctness because `hasProcessFn` guarantees `!isDomStrategy`.

## Correctness Check
Run `npm test -w packages/renderer` to ensure `run-all.ts` still passes.
