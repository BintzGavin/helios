---
id: PERF-149
slug: modulo-elimination
status: unclaimed
claimed_by: ""
created: 2024-10-25
completed: ""
result: ""
---

# PERF-149: Eliminate Modulo Arithmetic in Hot Capture Loop

## Focus Area
`packages/renderer/src/Renderer.ts` hot capture loop. We want to test whether eliminating the modulo operator (`%`) inside the high-frequency frame capture loop reduces V8 arithmetic overhead.

## Background Research
The `Renderer.ts` frame capture loop is the hottest path in the codebase. Currently, it assigns workers from the pool using a modulo operation: `const worker = pool[frameIndex % poolLen];`. While modern JIT compilers (like V8) optimize modulo operations relatively well, integer modulo is still a slow instruction compared to basic addition and branching. By maintaining a dedicated `workerIndex` counter that increments and wraps around via a simple `if` condition, we might marginally reduce arithmetic overhead inside the loop.

## Benchmark Configuration
- **Composition URL**: Standard benchmark fixture (`output/example-build/examples/simple-animation/composition.html`)
- **Render Settings**: Standard benchmark settings
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 32.057s (Current best as per journal)
- **Bottleneck analysis**: CPU arithmetic overhead in the hot loop.

## Implementation Spec

### Step 1: Replace Modulo with Increment and Wrap
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
In the `captureLoop`, declare a new variable `let workerIndex = 0;` outside the main `while` loop (or just before the inner `while` loop, tracking the index manually).
Since `nextFrameToSubmit` is monotonically increasing, we can maintain the index:
```typescript
let workerIndex = 0;
// inside the captureLoop:
while (nextFrameToSubmit < totalFrames && (nextFrameToSubmit - nextFrameToWrite) < maxPipelineDepth) {
    const frameIndex = nextFrameToSubmit;
    const worker = pool[workerIndex];

    workerIndex++;
    if (workerIndex >= poolLen) {
        workerIndex = 0;
    }

    const time = frameIndex * timeStep;
    // ...
```
**Why**: Simple addition and branching is generally faster than integer division/modulo on most CPU architectures.
**Risk**: Negligible risk. Logic remains identical. It may have no measurable impact if V8 already perfectly optimizes the `% poolLen` since `poolLen` is a constant integer for the duration of the loop.

## Variations
None.

## Correctness Check
Run `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to verify the DOM rendering still succeeds and produces a valid output.
