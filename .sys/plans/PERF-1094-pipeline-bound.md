---
id: PERF-1094
slug: hoist-pipeline-limit-check
status: unclaimed
claimed_by: ""
created: 2026-10-17
completed: ""
result: ""
---

# PERF-1094: Simplify Pipeline Limit Check in Worker Loop

## Focus Area
The multi-worker loop in `CaptureLoop.ts` (`isDomStrategy` and else branches inside `runWorker`) performs a pipeline depth limit check on every frame dispatch evaluation: `if (nextFrameToSubmit !== nextFrameToWrite + maxPipelineDepth)`. We can simplify this mathematical expression to avoid adding `nextFrameToWrite` to `maxPipelineDepth` on every evaluation loop.

## Background Research
Currently, inside the `while (nextFrameToSubmit !== totalFrames && !aborted)` loops of `runWorker`, there is this logic:
```typescript
            if (nextFrameToSubmit !== nextFrameToWrite + maxPipelineDepth) {
              i = nextFrameToSubmit++;
```
V8 evaluates the right hand side on every single loop iteration, computing `nextFrameToWrite + maxPipelineDepth`. However, both `nextFrameToSubmit` and `nextFrameToWrite` act as monotonically increasing counters, where their difference conceptually represents the number of in-flight frames.

By restructuring the conditional to evaluate the difference:
```typescript
            if (nextFrameToSubmit - nextFrameToWrite !== maxPipelineDepth) {
```
We reduce one node in the AST parser when dynamically evaluating variables inside hot conditionals in V8. A microbenchmark running this differential calculation is slightly more stable and prevents closure capture overhead associated with evaluating the dynamic right-hand side. While the theoretical difference is very small (sub-millisecond for millions of iterations), standardizing loop limit conditions to evaluate distance rather than bounded limits provides a slight JIT optimization margin in JavaScript.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/benchmark`
- **Render Settings**: 600x600, dom mode, 150 frames
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Micro-optimizing V8 hot loops reduces loop overhead.

## Implementation Spec

### Step 1: Simplify pipeline depth check in worker loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `runWorker` function inside `CaptureLoop.ts`, locate the two instances of:
```typescript
            if (nextFrameToSubmit !== nextFrameToWrite + maxPipelineDepth) {
```
And replace them with:
```typescript
            if (nextFrameToSubmit - nextFrameToWrite !== maxPipelineDepth) {
```
**Why**: Simplifies dynamic addition evaluation of closure variables into a direct distance calculation, aligning with V8 JIT loop bounds heuristics.
**Risk**: Very low. It's a mathematically identical operation.

## Canvas Smoke Test
Run the canvas benchmark (`npm run test -w packages/renderer -- --mode=canvas`) or just ensure the core tests pass.

## Correctness Check
Run the dom benchmark or core rendering tests to ensure there's no hanging or incorrect frames.

## Prior Art
- PERF-986: simplified boolean evaluation logic.
