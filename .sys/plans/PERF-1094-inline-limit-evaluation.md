---
id: PERF-1094
slug: inline-limit-evaluation
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1094: Inline Limit Variable in Dispatch Math

## Focus Area
The multi-worker dispatch paths in `CaptureLoop.ts` (`isDomStrategy` and else branches, as well as the initial write check) allocate a block-scoped `limit` variable to calculate how many frames can be dispatched. We can eliminate this assignment by inlining the expression.

## Background Research
Currently, inside the `freeWorkersHead !== 0` check in `CaptureLoop.ts`, the code is:
```typescript
                const limit = nextFrameToWrite + maxPipelineDepth;
                let dispatches = (limit < totalFrames ? limit : totalFrames) - nextFrameToSubmit;
```

In micro-benchmarks on V8, explicitly assigning block-scoped variables for single-use (or duplicate-use in a ternary) bounds calculations increases the Abstract Syntax Tree (AST) size and adds a minor overhead to local scope closure management. As seen in previous successful experiments like PERF-1078 (inlining `typeof finalBuffer` check) and PERF-1053 (inlining `dispatches`), removing intermediate constant assignments simplifies the JIT compiler's pipeline. We will inline `limit` directly into the ternary condition.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/benchmark`
- **Render Settings**: 1080p, 60fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~500ms
- **Bottleneck analysis**: Micro-optimizing V8 hot loops reduces loop overhead.

## Implementation Spec

### Step 1: Inline limit in writer loop dispatch checks
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the 3 instances of:
```typescript
                const limit = nextFrameToWrite + maxPipelineDepth;
                let dispatches = (limit < totalFrames ? limit : totalFrames) - nextFrameToSubmit;
```
And replace them with:
```typescript
                let dispatches = (nextFrameToWrite + maxPipelineDepth < totalFrames ? nextFrameToWrite + maxPipelineDepth : totalFrames) - nextFrameToSubmit;
```
Note: Depending on indentation, there are three identical blocks (lines ~436, ~560, ~626). Replace all of them.

**Why**: Removes the intermediate AST assignment of `limit`, aligning with the V8 JIT compiler's preference for direct expression evaluation in hot loops, lowering closure register pressure.
**Risk**: Very low. It's a mathematically identical operation.

## Canvas Smoke Test
Run the canvas benchmark (`npm run test -w packages/renderer -- --mode=canvas`) or just ensure the core tests pass.

## Correctness Check
Run the dom benchmark or core rendering tests to ensure there's no hanging or incorrect frames.

## Prior Art
- PERF-1053: Inlined `dispatches` expression.
- PERF-1078: Inlined `typeof` check.
