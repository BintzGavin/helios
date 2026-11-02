---
id: PERF-1165
slug: inline-timepromise-check-in-captureloop
status: complete
claimed_by: "executor-session"
created: 2026-11-02
completed: "2026-11-02"
result: "discarded"
---

# PERF-1165: Inline timePromise validation check into timeDriver.setTime assignment

## Focus Area
The multi-worker loop initialization inside `CaptureLoop.ts` `run()` method (specifically the `runWorker` definitions around lines 488-491 and 516-519).

## Background Research
Currently in `CaptureLoop.ts`, in the multi-worker path, `timePromise` is captured as an intermediate variable and checked for existence in a subsequent if-block before it is awaited:

```typescript
const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
if (timePromise) {
  await timePromise;
}
```

By inlining this to `const timePromise = timeDriver.setTime(...); if (timePromise) await timePromise;` on one line or combining it, it slightly reduces AST size by eliminating block curly braces and keeping the flow dense. While minor, V8's parser processes shorter syntax more quickly during JIT compilation of hot loops.

## Benchmark Configuration
- **Composition URL**: \`file:///app/examples/dom-benchmark/composition.html\`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: \`dom\`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.6s (based on latest benchmark logs)
- **Bottleneck analysis**: JIT compilation overhead for hot loop structures.

## Implementation Spec

### Step 1: Condense \`timePromise\` await blocks
**File**: \`packages/renderer/src/core/CaptureLoop.ts\`
**What to change**:
In the `runWorker` method, within the multi-worker loops (both `isDomStrategy` and `!isDomStrategy` paths), replace:

```typescript
const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
if (timePromise) {
  await timePromise;
}
```

with:

```typescript
const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
if (timePromise) await timePromise;
```

**Why**: Simplifies the V8 AST by removing block scoping overhead for the if statement, generating a slightly smaller bytecode representation.
**Risk**: Negligible risk, standard syntax transformation.

## Variations
None.

## Canvas Smoke Test
Run \`npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas\` to ensure the canvas specific closure executes properly.

## Correctness Check
Run \`npm run test --workspace=packages/renderer\` to verify rendering still works correctly.

## Prior Art
AST simplification optimizations (PERF-1116, PERF-1078).
## Results Summary
- **Best render time**: 8.709s (vs baseline 8.695s)
- **Improvement**: 0%
- **Kept experiments**: None
- **Discarded experiments**: PERF-1165
