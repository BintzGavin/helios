---
id: PERF-997
slug: merge-duplicated-loops-hasprocessfn
status: unclaimed
claimed_by: ""
created: 2026-07-13
completed: ""
result: ""
---

# PERF-997: Merge duplicated chunk writer loops in single-worker paths

## Focus Area
The single-worker `hasProcessFn` path in `packages/renderer/src/core/CaptureLoop.ts` has completely duplicated while loops for `if (isDomStrategy)` and its `else` branch (Canvas strategy).

## Background Research
Currently, inside the `hasProcessFn` block of the single-worker capture loop, there is a large branch structure:
\`\`\`typescript
if (isDomStrategy) {
  let i = 1;
  while (i < totalFrames - 1 && !aborted) { ... }
} else {
  let i = 1;
  while (i < totalFrames - 1 && !aborted) { ... }
}
\`\`\`

The chunk loop logic is practically identical between the DOM and Canvas strategies.

We can merge these two loops into a single unified chunk loop that handles both. By doing so, we significantly reduce the size of the AST nodes that V8 has to parse and JIT compile, which can allow TurboFan to better optimize the hot loop path. This same optimization (merging chunk loops) was previously done in PERF-975 and PERF-992 and provided a solid improvement.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard
- **Mode**: \`dom\` (single worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Duplicated hot while loops increase V8 parsing time and instruction cache footprint.

## Implementation Spec

### Step 1: Merge the chunk loops in the \`hasProcessFn\` path
**File**: \`packages/renderer/src/core/CaptureLoop.ts\`
**What to change**:
Instead of \`if (isDomStrategy) { while (...) { ... } } else { while (...) { ... } }\` in the \`hasProcessFn\` branch, merge them into a single loop. Ensure the \`domBeginFrame\` and \`strategy.processCaptureResult\` logic is correctly conditioned inside the shared \`for\` and \`while\` loop blocks.

**Why**: Consolidating identical looping constructs shrinks the JavaScript AST and bytecode size. It allows the V8 JIT engine to optimize a single hot path rather than dividing its inline cache budget across two functionally identical loops, leading to more aggressive optimizations for the shared instructions.

## Correctness Check
1.  Run \`npm test -w packages/renderer\` to ensure nothing is broken.
2.  Run \`npm run build -w packages/core && npm run build -w packages/player\` to ensure the project builds correctly.
