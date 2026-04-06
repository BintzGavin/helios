---
id: PERF-191
slug: inline-seektimedriver-params
status: unclaimed
claimed_by: ""
created: 2024-05-29
completed: ""
result: ""
---

PERF-191: Inline Parameters in SeekTimeDriver.setTime

Focus Area
The setTime method in SeekTimeDriver.ts. This method sits in the hot loop of the DOM rendering pipeline and executes cdpSession.send('Runtime.evaluate') to advance composition time per frame.

Background Research
The SeekTimeDriver.ts class dynamically allocates an object literal params every frame in the setTime loop before passing it into cdpSession.send. In previous experiments, we observed that avoiding dynamic object allocation into local variables and explicitly passing object literals or cached variables could reduce memory overhead and garbage collection stalls in Playwright loop iterations. A simpler approach combining parameter inlining with the removal of unnecessary default arguments (returnByValue: false) may yield smaller bytecode profiles and faster IPC marshalling without complex type casting that caused regressions in PERF-180.

Benchmark Configuration
- Composition URL: examples/simple-canvas-animation/composition.html (run in dom mode via sed mutation in test runner)
- Render Settings: 1280x720, 30 FPS, 5 seconds (150 frames)
- Mode: dom
- Metric: Wall-clock render time in seconds
- Minimum runs: 3 per experiment, report median

Baseline
- Current estimated render time: ~49.436s
- Bottleneck analysis: Micro-optimizing V8 object allocations within the hot loop.

Implementation Spec

Step 1: Use run_in_bash_session to apply diff to SeekTimeDriver.ts
File: packages/renderer/src/drivers/SeekTimeDriver.ts
What to change: Inline the Runtime.evaluate parameters object directly into the send() call and remove the default parameter returnByValue: false.

Use the replace_with_git_merge_diff tool or sed commands to inline the arguments and remove the returnByValue configuration.

Step 2: Verification
1. Run npx tsc --noEmit in packages/renderer to ensure type safety.
2. Run npm test -w packages/renderer or basic test to ensure syntax validity.

Variations
None.

Canvas Smoke Test
Run npx tsx tests/verify-canvas-strategy.ts to ensure Canvas mode is not broken.

Correctness Check
Run the DOM benchmark:
npx tsx packages/renderer/tests/fixtures/benchmark.ts (with dom mode active).

Prior Art
- PERF-178: Inline parameters in DomStrategy.ts
- PERF-180: Failed inline approach (this revision is simplified to avoid complex type casting that may trigger de-opts).
