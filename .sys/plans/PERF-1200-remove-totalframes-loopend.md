---
id: PERF-1200
slug: remove-totalframes-loopend
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-1200: Simplify final frame condition in CaptureLoop single-worker fast path

## Focus Area
The single-worker fast path final frame writing in `packages/renderer/src/core/CaptureLoop.ts`. Specifically the lines `if (!aborted && totalFrames > 1)` located around line 232 and 328.

## Background Research
Currently in `CaptureLoop.ts`, in the single-worker path, the function performs an early loop out of the chunk block, and then captures the last frame:
```typescript
          let i = 1;
          const loopEnd = totalFrames - 1;
          while (i < loopEnd && !aborted) { ... }

          if (!aborted && totalFrames > 1) {
            // write final frame
```
Here, `totalFrames > 1` is mathematically exactly equivalent to `loopEnd !== 0`. `loopEnd` is a block-scoped constant local to the execution context. Using `loopEnd !== 0` avoids referencing the outer `totalFrames` closure variable again, slightly reducing the scope chain lookup and AST parsing complexity for the JIT compiler.

We will replace `totalFrames > 1` with `loopEnd !== 0`.

## Benchmark Configuration
- **Composition URL**: standard DOM benchmark composition
- **Render Settings**: 1920x1080, 60fps, dom mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.7s
- **Bottleneck analysis**: Micro-optimizing closure variable lookups in the fast path single-worker final block.

## Implementation Spec

### Step 1: Replace `totalFrames > 1` with `loopEnd !== 0`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategy` block, replace `if (!aborted && totalFrames > 1)` with `if (!aborted && loopEnd !== 0)`.
Do exactly the same in the `else` block for `!isDomStrategy`, replacing `if (!aborted && totalFrames > 1)` with `if (!aborted && loopEnd !== 0)`.

**Why**: Reuses the block-scoped `loopEnd` constant rather than climbing the closure scope chain to read `totalFrames` and subtract 1 mentally, reducing V8 AST complexity for the fast single-worker frame generation block.

## Correctness Check
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=dom` to verify correctness and no regressions.
