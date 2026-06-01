---
id: PERF-649
slug: optimize-captureloop-await
status: complete
claimed_by: "executor-session"
created: 2024-06-01
completed: "2024-06-01"
result: "discard"
---

# PERF-649: Optimize Await Chain in CaptureLoop

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts`

## Background Research
Currently in `CaptureLoop.ts`, if `setTimeResult` is present, it uses a `.then()` chain to capture the frame: `await setTimeResult.then(() => strategy.capture(page, time))`. This allocates an intermediate closure and Promise. By replacing this with sequential `await` statements (i.e., `if (setTimeResult) await setTimeResult; const buffer = await strategy.capture(page, time);`), we can avoid allocating the closure and the intermediate `.then()` microtask on every frame, allowing V8 to optimize the sequential awaits natively.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames), mp4 libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.594s

## Implementation Spec
Replace the conditional expression with sequential `await`s.

## Results Summary
- **Best render time**: ~2.931s (vs baseline ~3.003s)
- **Improvement**: 0% (within noise)
- **Kept experiments**: []
- **Discarded experiments**: [PERF-649: Optimize Await Chain in CaptureLoop]
