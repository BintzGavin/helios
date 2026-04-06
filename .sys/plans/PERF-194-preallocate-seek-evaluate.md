---
id: PERF-194
slug: preallocate-seek-evaluate
status: complete
claimed_by: "executor"
created: 2024-06-01
completed: "2024-06-01"
result: "improved"
---
# PERF-194: Preallocate Runtime.evaluate Parameters in SeekTimeDriver

## Focus Area
packages/renderer/src/drivers/SeekTimeDriver.ts - setTime method.

## Background Research
The SeekTimeDriver constructs a new object literal { expression: ..., awaitPromise: true } on every invocation. We can pre-allocate an object as a class property to reduce allocations.

## Benchmark Configuration
- Composition URL: file:///app/output/example-build/examples/simple-animation/composition.html
- Render Settings: 1280x720, 30fps, 5 seconds
- Mode: dom
- Metric: Wall-clock render time in seconds
- Minimum runs: 3 per experiment, report median

## Implementation Spec
Cache evaluateParams in SeekTimeDriver and reuse it.
