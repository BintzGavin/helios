---
id: PERF-1150
slug: unroll-isdomstrategy-final-frame
status: unclaimed
claimed_by: ""
created: 2024-10-31
completed: ""
result: ""
---

# PERF-1150: Unroll isDomStrategy in single worker final frame logic

## Focus Area
The final frame logic for single-worker capture in `CaptureLoop.ts` has an `if (!aborted && totalFrames > 1)` block that checks `isDomStrategy` inside it. This can be unrolled to separate `if` blocks.

## Background Research
Currently, the single-worker capture loop contains a final block `if (!aborted && totalFrames > 1)` that further branches on `if (isDomStrategy)` versus `else`. Since `isDomStrategy` is constant for the duration of the run, this branch check is evaluated unnecessarily during runtime. Unrolling it to `if (isDomStrategy) { if (!aborted && totalFrames > 1) { ... } } else { if (!aborted && totalFrames > 1) { ... } }` reduces V8 branch parsing overhead.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.68s
- **Bottleneck analysis**: Micro optimizations inside the hot loops.

## Implementation Spec

### Step 1: Unroll isDomStrategy in single worker final frame logic
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Unroll `if (isDomStrategy)` check for the final frame block to separate it out. \n\nChange:\n```typescript\n        if (!aborted && totalFrames > 1) {\n          if (isDomStrategy) {\n//...\n          } else {\n//...\n          }\n        }\n```\nTo:\n```typescript\n        if (isDomStrategy) {\n          if (!aborted && totalFrames > 1) {\n//...\n          }\n        } else {\n          if (!aborted && totalFrames > 1) {\n//...\n          }\n        }\n```
**Why**: Reduces logic and AST size in hot loops.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas` to ensure basic canvas rendering functions still operate correctly.

## Correctness Check
Run `npm run test -w packages/renderer` to verify the DOM rendering and pipeline structure.

## Prior Art
Previous single-worker micro loop optimizations.
