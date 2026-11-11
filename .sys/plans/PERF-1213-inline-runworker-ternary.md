---
id: PERF-1213
slug: inline-runworker-ternary
status: unclaimed
claimed_by: ""
created: 2026-11-10
completed: ""
result: ""
---
# PERF-1213: Inline worker scheduling logic with ternary operators to reduce AST evaluation

## Focus Area
The multi-worker inner loop `runWorker` has a small `if/else` block that schedules `nextFrameToSubmit`. In hot loops, reducing branches by using ternary operators and comma operators shrinks the AST footprint.

## Background Research
Currently in the multi-worker `runWorker` closures (in `CaptureLoop.ts`), the frame allocation logic uses `if/else` statements:
```typescript
              while (nextFrameToSubmit !== totalFrames && !aborted) {
                let i: number;
                if (nextFrameToSubmit !== nextFrameToWrite + maxPipelineDepth) {
                  i = nextFrameToSubmit++;
                } else {
                  freeWorkers[freeWorkersHead++] = workerIndex;
                  i = (await workerThenables[workerIndex]) as any as number;
                }

                if (i === -1) break;
```

This allocates `let i`, then branches into either an `if` block (the fast path when the pipeline isn't full) or an `else` block (the slow path where we queue the worker).
By using a ternary expression with the comma operator for the else block, we can convert this into a single AST expression that allocates `const i` directly:
```typescript
              while (nextFrameToSubmit !== totalFrames && !aborted) {
                const i = nextFrameToSubmit !== nextFrameToWrite + maxPipelineDepth
                  ? nextFrameToSubmit++
                  : (freeWorkers[freeWorkersHead++] = workerIndex, (await workerThenables[workerIndex]) as any as number);

                if (i === -1) break;
```
This is semantically identical, preserves V8's fast-path TurboFan optimization capabilities, and eliminates branching overhead in the JavaScript AST parsing and evaluation.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-canvas-animation/composition.html`
- **Render Settings**: 1080p, 60fps, 5 seconds
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The fast path block inside `runWorker` evaluates frame assignments for every single rendered frame. While fast, an `if/else` block with an uninitialized `let` variable can be marginally slower than a direct `const` assignment via ternary.

## Implementation Spec

### Step 1: Inline logic into ternary assignment inside `runWorker`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In both `isDomStrategy` and non-DOM `runWorker` definitions (lines ~448 and ~473), replace the `if/else` block with a single ternary assignment for `const i`:

From:
```typescript
                let i: number;
                if (nextFrameToSubmit !== nextFrameToWrite + maxPipelineDepth) {
                  i = nextFrameToSubmit++;
                } else {
                  freeWorkers[freeWorkersHead++] = workerIndex;
                  i = (await workerThenables[workerIndex]) as any as number;
                }
```
To:
```typescript
                const i = nextFrameToSubmit !== nextFrameToWrite + maxPipelineDepth
                  ? nextFrameToSubmit++
                  : (freeWorkers[freeWorkersHead++] = workerIndex, (await workerThenables[workerIndex]) as any as number);
```

**Why**: Simplifies AST into a direct value expression instead of imperative blocks, eliminating `let` mutability tracking for `i`.

## Correctness Check
Run renderer tests and benchmark script to confirm frames are processed and assigned accurately.
