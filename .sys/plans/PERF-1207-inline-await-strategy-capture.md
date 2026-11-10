---
id: PERF-1207
slug: inline-await-strategy-capture
status: unclaimed
claimed_by: ""
created: 2026-11-10
completed: ""
result: ""
---
# PERF-1207: Inline await strategy.capture into frameBufferRing assignment

## Focus Area
The multi-worker loop in `CaptureLoop.ts` uses an intermediate `rawResult` variable to store the result of `await strategy.capture()` before casting and assigning it to the `frameBufferRing`.

## Background Research
Currently in the multi-worker `runWorker` loops (for the DOM strategy), the code looks like this:
```typescript
                const rawResult = await strategy.capture(page, i * timeStep);
                frameBufferRing[i & ringMask] = rawResult as string;
```
By eliminating the intermediate variable `rawResult`, we can reduce AST node evaluation overhead in V8 during the hot frame capture path.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-canvas-animation/composition.html`
- **Render Settings**: 1080p, 60fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The intermediate variable assignment `const rawResult` inside the multi-worker DOM runWorker loop adds unnecessary AST evaluation overhead.

## Implementation Spec

### Step 1: Inline `rawResult` assignment in multi-worker DOM loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `runWorker` definition for `isDomStrategy`, change:
```typescript
                const rawResult = await strategy.capture(page, i * timeStep);
                frameBufferRing[i & ringMask] = rawResult as string;
```
to:
```typescript
                frameBufferRing[i & ringMask] = (await strategy.capture(page, i * timeStep)) as string;
```
**Why**: This reduces the number of variables and assignments within the tight multi-worker capture loop, simplifying V8 AST parsing and execution.

## Correctness Check
Run the standard renderer benchmark verifying that the DOM mode renders correctly without errors and verify the output using `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=dom --url=file:///app/examples/simple-canvas-animation/composition.html`.
