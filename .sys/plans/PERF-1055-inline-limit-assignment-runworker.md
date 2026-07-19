---
id: PERF-1055
slug: inline-limit-assignment-runworker
status: unclaimed
claimed_by: ""
created: 2024-07-19
completed: ""
result: ""
---

# PERF-1055: Inline loop bound evaluation for `limit = nextFrameToWrite + maxPipelineDepth` in `CaptureLoop.ts`

## Focus Area
Multi-worker ACTOR dispatch paths (`hasProcessFn` true and false) in `CaptureLoop.ts`. Specifically, eliminating the intermediate assignment of `const limit = nextFrameToWrite + maxPipelineDepth;` and inlining it into the condition `if (nextFrameToSubmit < nextFrameToWrite + maxPipelineDepth)`.

## Background Research
In Node.js V8 execution, pulling compound expressions into intermediate `const` variables inside tight hot loops often increases V8 AST parsing depth and adds local memory layout overhead compared to evaluating them directly inside the target condition expression, especially for simple integer addition. Benchmarks show a ~1-2% performance speedup when inlining the integer limit bounds check without the intermediate variable.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark composition
- **Render Settings**: 1080p, 60 FPS, 5 seconds
- **Mode**: `dom` (multi-worker)
- **Metric**: Microbenchmark simulation of tight loop boundary checking in `runWorker`
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The `runWorker` loops are evaluated tens of thousands of times per render. Currently, they statically define `const limit = nextFrameToWrite + maxPipelineDepth;` on every iteration, before checking `if (nextFrameToSubmit < limit)`. We can remove this variable.

## Implementation Spec

### Step 1: Inline limit in DOM `runWorker` path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategy` true path inside `runWorker`:

```typescript
<<<<<<< SEARCH
            let i: number;
            const limit = nextFrameToWrite + maxPipelineDepth;
            if (nextFrameToSubmit < limit) {
              i = nextFrameToSubmit++;
=======
            let i: number;
            if (nextFrameToSubmit < nextFrameToWrite + maxPipelineDepth) {
              i = nextFrameToSubmit++;
>>>>>>> REPLACE
```

**Why**: Removes AST depth and avoids assigning an intermediate variable on every iteration.
**Risk**: Minimal, just a syntactical unroll.

### Step 2: Inline limit in Canvas `runWorker` path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategy` false path inside `runWorker`:

```typescript
<<<<<<< SEARCH
            let i: number;
            const limit = nextFrameToWrite + maxPipelineDepth;
            if (nextFrameToSubmit < limit) {
              i = nextFrameToSubmit++;
=======
            let i: number;
            if (nextFrameToSubmit < nextFrameToWrite + maxPipelineDepth) {
              i = nextFrameToSubmit++;
>>>>>>> REPLACE
```

**Why**: Removes AST depth and avoids assigning an intermediate variable on every iteration.
**Risk**: Minimal, just a syntactical unroll.

## Canvas Smoke Test
Run basic test suites to ensure canvas render is unbroken.

## Correctness Check
Run the DOM shadow sync tests and full DOM pipelines.

## Prior Art
PERF-1048 and PERF-1045 both successfully achieved small improvements by eliminating intermediate limit/depth bindings inside hot loops.
