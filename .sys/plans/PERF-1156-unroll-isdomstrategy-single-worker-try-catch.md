---
id: PERF-1156
slug: unroll-isdomstrategy-single-worker-try-catch
status: complete
claimed_by: "PERF-1156"
created: 2024-11-01
completed: ""
result: "improved"
---

# PERF-1156: Unroll isDomStrategy in single worker try-catch blocks

## Focus Area
Fast path single-worker logic in `CaptureLoop.ts`. Specifically, completely unrolling the single worker execution path by isolating the `isDomStrategy` check outside of the monolithic `try/catch` block.

## Background Research
Currently, inside the single-worker path, the execution relies on an `isDomStrategy` flag (lines 173, 233, 317 in `CaptureLoop.ts`) to decide how to process captures (Base64 vs raw Buffer) and how to handle initialization and loops. The `if (isDomStrategy)` check is evaluated for the initialization frame, inside the chunking loop dispatcher, and for the final frame.
Because the worker strategy cannot change during the execution of `run()`, we can hoist the `isDomStrategy` check completely out of the single worker `try...catch` block, splitting the single-worker path into two distinct `try...catch` implementations—one for `isDomStrategy` and one for the non-DOM (canvas) strategy. This eliminates repeated branch evaluations in the JS engine and simplifies the V8 AST for each hot path.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.608s
- **Bottleneck analysis**: Redundant conditional branch evaluation inside the single-worker execution sequence.

## Implementation Spec

### Step 1: Hoist `isDomStrategy` to wrap the single-worker try-catch blocks
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Change the single worker structure from:
```typescript
      const isDomStrategy = !!(strategy as any).cdpSession;

      try {
        let progressCounter = progressInterval;
        let nextCapturePromise: any = null;
        if (isDomStrategy) {
          // DOM init
        } else {
          // Canvas init
        }

        let i = 1;
        const loopEnd = totalFrames - 1;
        if (isDomStrategy) {
          while (i < loopEnd && !aborted) { ... }
        } else {
          while (i < loopEnd && !aborted) { ... }
        }

        if (isDomStrategy) {
          // DOM final
        } else {
          // Canvas final
        }
      } catch (e) { ... } finally { ... }
```
To:
```typescript
      const isDomStrategy = !!(strategy as any).cdpSession;

      if (isDomStrategy) {
        try {
          // All DOM logic: init, loop, final
        } catch (e) {
          fatalError = e;
        } finally {
          if (signal && abortListener) {
            signal.removeEventListener("abort", abortListener);
          }
        }
      } else {
        try {
          // All Canvas logic: init, loop, final
        } catch (e) {
          fatalError = e;
        } finally {
          if (signal && abortListener) {
            signal.removeEventListener("abort", abortListener);
          }
        }
      }
```
**Why**: Ensures V8 TurboFan does not have to parse overlapping code paths or branch jumps across the entire single-worker rendering run, reducing AST instruction overhead for the hot fast paths.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas` to ensure basic canvas rendering functions still operate correctly.

## Correctness Check
Run `npm run test -w packages/renderer` to verify the DOM rendering and pipeline structure.

## Prior Art
Similar multi-worker unrolling optimizations (e.g. PERF-1152) and previous inner loop isolations.
