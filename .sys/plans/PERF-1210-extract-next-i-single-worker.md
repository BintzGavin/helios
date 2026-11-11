---
id: PERF-1210
slug: extract-next-i-single-worker
status: unclaimed
claimed_by: ""
created: 2024-06-03
completed: ""
result: ""
---

# PERF-1210: Extract Duplicate `i + 1` Addition into a `nextI` Constant in Single-Worker Capture Loops

## Focus Area
Single-worker frame capture loops in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, optimizing the repetitive `i + 1` AST evaluation inside the hot loops for both DOM and Canvas strategies.

## Background Research
In the single-worker capture pipeline, the code maintains a pipeline depth of 1 by initiating the capture for the *next* frame (`i + 1`) while processing the result of the current frame. Currently, the math `i + 1` is evaluated twice per frame inside the hottest loop:
1. `(startFrame + i + 1) * compTimeStep`
2. `(i + 1) * timeStep`

In V8, every binary addition inside a loop represents an AST node that the TurboFan compiler must parse and optimize. By extracting `const nextI = i + 1;` and reusing it, we eliminate one binary addition per frame and simplify the parser tree, which can yield compound micro-optimizations across thousands of frames. Similar AST simplification strategies (like PERF-1207 and PERF-1182) have yielded consistent, marginal gains.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-dom-animation/composition.html`
- **Render Settings**: 1920x1080, 60 FPS, 5 seconds (300 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~6.29s (from PERF-1207)
- **Bottleneck analysis**: V8 parsing and AST evaluation in the synchronous frame iteration block of the single-worker strategy pipeline.

## Implementation Spec

### Step 1: Extract `nextI` in the Single-Worker DOM Strategy Loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategy` single-worker loop (around the `for (; i !== chunkEnd; i++)` block), replace the inline `i + 1` additions with a hoisted block-scoped constant.

Change this:
```typescript
              timeDriver.setTime(
                page,
                (startFrame + i + 1) * compTimeStep,
              );

              if (!aborted) {
                nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
              }
```
To this:
```typescript
              const nextI = i + 1;
              timeDriver.setTime(
                page,
                (startFrame + nextI) * compTimeStep,
              );

              if (!aborted) {
                nextCapturePromise = strategy.capture(page, nextI * timeStep);
              }
```
**Why**: Reduces duplicate addition operations and AST complexity in the hot loop.
**Risk**: Negligible. It strictly preserves the existing arithmetic logic.

### Step 2: Extract `nextI` in the Single-Worker Canvas Strategy Loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Apply the exact same extraction in the `else` block (Canvas strategy) for the single-worker loop.

Change this:
```typescript
              const timePromise = timeDriver.setTime(
                page,
                (startFrame + i + 1) * compTimeStep,
              );
              if (timePromise) await timePromise;

              if (!aborted) {
                nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
              }
```
To this:
```typescript
              const nextI = i + 1;
              const timePromise = timeDriver.setTime(
                page,
                (startFrame + nextI) * compTimeStep,
              );
              if (timePromise) await timePromise;

              if (!aborted) {
                nextCapturePromise = strategy.capture(page, nextI * timeStep);
              }
```
**Why**: Ensures both strategies benefit from the AST simplification.
**Risk**: Negligible.

## Variations
No major variations needed as this is a strict structural simplification.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas --url=file:///app/examples/simple-canvas-animation/composition.html` to ensure Canvas mode still renders cleanly and correctly.

## Correctness Check
Run `npx vitest run tests/verify-cdp-determinism.test.ts` to ensure frame sequence determinism is unaffected.

## Prior Art
- PERF-1182: Removed redundant dynamic progress counter math in single-worker fast paths.
- PERF-1207: Inlined `rawResult` into multi-worker loops to avoid intermediate allocations.
- Both achieved slight V8 execution wins by simplifying AST logic in hot loops.
