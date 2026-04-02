---
id: PERF-154
slug: cache-joboptions
status: complete
claimed_by: ""
created: 2024-10-25
completed: 2026-04-02
result: kept
---
# PERF-154: Cache jobOptions Properties in Hot Loop

## Focus Area
`packages/renderer/src/Renderer.ts` hot capture loop.

## Background Research
Inside the `captureLoop` of `Renderer.ts`, the optional chaining properties `jobOptions?.signal?.aborted` and `jobOptions?.onProgress` are accessed repeatedly in the `while` loop condition `while (nextFrameToWrite < totalFrames)`. Optional chaining compiles to multiple conditional checks in Javascript, increasing V8 branch evaluations. By caching these properties (e.g., `const signal = jobOptions?.signal`, `const onProgress = jobOptions?.onProgress`) immediately before the `while` loop, we can eliminate redundant optional property evaluations and reduce micro-stalls within the frame capture hot loop.

## Benchmark Configuration
- **Composition URL**: Standard benchmark fixture (`output/example-build/examples/simple-animation/composition.html`)
- **Render Settings**: Standard benchmark settings
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.400s
- **Bottleneck analysis**: Property access overhead and branch evaluations within the hot loop.

## Implementation Spec

### Step 1: Cache jobOptions properties
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Before `while (nextFrameToWrite < totalFrames)`, cache the variables:
```typescript
const signal = jobOptions?.signal;
const onProgress = jobOptions?.onProgress;
```
Inside the `while` loop, replace `if (jobOptions?.signal?.aborted)` with `if (signal && signal.aborted)`.
Replace the `if (jobOptions?.onProgress)` check with `if (onProgress)` and execute the `onProgress` call directly.

**Why**: To eliminate repetitive property access and branch evaluation overhead for static options across every frame iteration.
**Risk**: Negligible risk. Logic remains identical.

## Variations
None.

## Correctness Check
Run `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to verify the DOM rendering still succeeds and produces a valid output.
