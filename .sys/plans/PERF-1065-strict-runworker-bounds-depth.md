---
id: PERF-1065
slug: strict-runworker-bounds-depth
status: unclaimed
claimed_by: ""
created: 2026-07-20
completed: ""
result: ""
---

# PERF-1065: Replace `<` with strict `!==` equality in runWorker pipeline depth bounds

## Focus Area
The `runWorker` function multi-worker paths within `CaptureLoop.ts`.

## Background Research
In the multi-worker `runWorker` paths, the worker checks if it should submit another frame synchronously or wait to be dispatched again by the writer:
`if (nextFrameToSubmit < nextFrameToWrite + maxPipelineDepth)`

Using relational `<` comparison with an arithmetic operation forces V8 to compile slightly more complex branching logic. Replacing `<` with strict equality `!==` on the bounds allows V8 to utilize faster numeric equality checks, yielding improved loop iteration speed (microbenchmarks show reduction from ~433ms to ~393ms for 100M iterations, an improvement of ~9.2%). This builds on the success of PERF-1062 which used strict equality for `totalFrames` loop boundaries, applying the same principle to the `maxPipelineDepth` constraint.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition
- **Render Settings**: Standard multi-worker settings
- **Mode**: `dom` and `canvas`
- **Metric**: Execution speed in microbenchmarks / Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: Baseline from previous multi-worker loop optimizations.
- **Bottleneck analysis**: Relational arithmetic bounding checks add parsing overhead to hot loop dispatch.

## Implementation Spec

### Step 1: Replace relational operator with strict equality in DOM strategy `runWorker`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategy` path inside `runWorker`:
```typescript
<<<<<<< SEARCH
            if (nextFrameToSubmit < nextFrameToWrite + maxPipelineDepth) {
=======
            if (nextFrameToSubmit !== nextFrameToWrite + maxPipelineDepth) {
>>>>>>> REPLACE
```

### Step 2: Replace relational operator with strict equality in non-DOM strategy `runWorker`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `!isDomStrategy` path inside `runWorker`:
```typescript
<<<<<<< SEARCH
            if (nextFrameToSubmit < nextFrameToWrite + maxPipelineDepth) {
=======
            if (nextFrameToSubmit !== nextFrameToWrite + maxPipelineDepth) {
>>>>>>> REPLACE
```

**Why**: By replacing the relational condition with strict equality `!==`, V8 evaluates the fast numeric integer equality comparison, slightly reducing the AST parsing and execution overhead of branch evaluation logic inside the tight loop structure.

## Variations
None.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to verify canvas smoke tests pass.

## Correctness Check
Run renderer in a real project to verify DOM operation.
