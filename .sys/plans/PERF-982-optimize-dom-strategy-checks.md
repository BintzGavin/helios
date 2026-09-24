---
id: PERF-982
slug: optimize-dom-strategy-checks
status: unclaimed
claimed_by: ""
created: 2024-07-12
completed: ""
result: ""
---

# PERF-982: Unroll multiple isDomStrategy checks in frame 0 and frame 1 initialization

## Focus Area
The single-worker fast loops initialization phases in `packages/renderer/src/core/CaptureLoop.ts` (around line 200 and 420).

## Background Research
After entering the single-worker initialization, the code performs `totalFrames > 0` and `1 < totalFrames` setup before the main rendering loop. During this initialization, the `isDomStrategy` boolean is evaluated multiple times for `nextCapturePromise`, `buffer`, and `writeSuccess` variable setups. For instance:

```typescript
if (isDomStrategy) { nextCapturePromise = domBeginFrame!(); } else { ... }
...
if (isDomStrategy) { buffer = domLastFrameData; } else { buffer = strategy.processCaptureResult!(rawResult); }
...
if (isDomStrategy) { ... writeSuccess = stream.write(buf); } else { ... writeSuccess = stream.write(buffer as any); }
```

Evaluating `if (isDomStrategy)` three separate times in sequence for frame 0 and frame 1 forces the V8 engine to execute unnecessary branch tests. We can group these checks into a single `if (isDomStrategy) { ... } else { ... }` block to streamline the initialization and give the JIT compiler a clearer, non-interleaved execution path.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard
- **Mode**: `dom` and `canvas` (single-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: JIT compilation and V8 engine parsing overhead is needlessly inflated by phantom branches in the hot path.

## Implementation Spec

### Step 1: Unroll tautological `isDomStrategy` in initialization sequence
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker initialization (around line 200), locate the sequence of multiple `if (isDomStrategy)` checks that set up `nextCapturePromise`, extract the `buffer`, and handle `writeSuccess`.
Combine them into a single outer `if (isDomStrategy) { ... } else { ... }` block that fully executes frame 0 and frame 1 processing sequentially.

**Why**: By flattening the branches into two continuous linear blocks, V8 avoids re-evaluating the `isDomStrategy` closure variable across multiple ticks.

## Correctness Check
Run `npm test -w packages/renderer` to ensure nothing is broken.
