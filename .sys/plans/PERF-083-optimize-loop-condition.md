---
id: PERF-083
slug: optimize-loop-condition
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---
# PERF-083: Optimize Renderer Hot Loop Condition Variables

## Focus Area
The `Renderer.ts` frame loop is the primary hot loop that dictates the overall rendering performance. Inside this loop, several variables are accessed repetitively in `while` loop conditions, specifically `totalFrames` and `poolLen`.

## Background Research
In highly optimized V8 JavaScript code, repeatedly calculating or looking up object properties in tight `while` or `for` loop conditions can introduce micro-stalls. By caching the `poolLen * 8` calculation directly outside the innermost `while` loop, we can reduce the arithmetic instructions and property lookups performed per frame. In PERF-082, we saw a slight improvement by caching array lengths. Extending this to pre-calculate the active pipeline limit (`poolLen * 8`) should yield further marginal, but compounding, gains.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (e.g., tests/fixtures/benchmark.ts)
- **Render Settings**: Standard benchmark settings
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.696s (from PERF-082)
- **Bottleneck analysis**: Micro-stalls in the V8 engine during the frame loop due to repetitive loop condition calculations (`nextFrameToSubmit - nextFrameToWrite < poolLen * 8`).

## Implementation Spec

### Step 1: Pre-calculate Pipeline Limit
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Locate the `while` loop condition containing `poolLen * 8` inside the frame loop and extract the calculation into a new `maxPipelineDepth` variable immediately preceding the loop. Use the new variable in the while loop condition instead.

**Why**: This avoids multiplying `poolLen` by 8 on every single iteration of the inner while loop. While `poolLen` is cached, the multiplication still occurs. By caching the exact limit, we save V8 from executing the math repeatedly.
**Risk**: Extremely low risk. It's a pure refactoring optimization that preserves the exact same logic.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-dom-selector.ts` to ensure basic rendering still works.

## Correctness Check
Run `tests/fixtures/benchmark.ts` script to ensure frames are still output correctly.

## Prior Art
- PERF-082 (Cached array lengths in hot loops)
