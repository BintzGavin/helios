---
id: PERF-235
slug: move-closure-logic-outside-captureloop
status: unclaimed
claimed_by: ""
created: 2024-04-10
completed: "2024-04-10"
result: "improved"
---
# PERF-235: Move capture closure logic outside of CaptureLoop to avoid V8 allocation on every run iteration

## Focus Area
The `CaptureLoop` hot-path closure inside the `run()` method explicitly binds `noopCatch` and `captureWorkerFrame` into anonymous functions dynamically per `run` iteration, causing V8 garbage collection overhead and potential dynamic scope pollution for each rendering job.

## Background Research
JavaScript (V8) exhibits optimization penalties when functions are declared inside other functions that are invoked frequently or that form deep lexical scopes holding onto larger context variables (such as `this`). Moving helper logic out of the class or attaching them as class methods eliminates inner closures, promoting them to global or shared V8 optimizations. While `captureWorkerFrame` is already optimized inside `run()` relative to previous commits, moving it strictly out of the `run()` method ensures that V8's Inline Caches (IC) stabilize correctly.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/dom.html`
- **Render Settings**: 1280x720, 60fps, 10s, `libx264` codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.896s
- **Bottleneck analysis**: Micro-stalls allocating internal context frames for nested declarations inside the `CaptureLoop` class instance variables instead of pure static modules.

## Implementation Spec

### Step 1: Extract `captureWorkerFrame` and callbacks to static module scope
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Move `captureWorkerFrame` and `noopCatch` entirely outside the `CaptureLoop` class definition. Define them at the top of the file as constant module-level arrow functions. Note: `captureWorkerFrame` already takes everything it needs as arguments, making it perfectly suited to be moved completely outside the class to the top level of the file. Move `noopCatch` outside as well.
**Why**: Avoid re-instantiating inner functions or allocating closure environments for `captureWorkerFrame` each time a new `CaptureLoop` is constructed or a frame is parsed, lowering overall allocation count to 0 in V8's context.
**Risk**: Breaking scope references. We must explicitly pass dependencies.

## Variations
### Variation A: Class Methods
Instead of module-level static functions, change `captureWorkerFrame` into a private class method and explicitly bind or call it using `this`.

## Canvas Smoke Test
Run `npx tsx tests/benchmark-test.js` or `npx vitest run packages/renderer` with the `--mode=canvas` option to ensure stability.

## Correctness Check
Run `npm run build:examples && npx tsx tests/run-all.ts` inside `packages/renderer`.
Ensure the output video matches the timeline duration without glitches or skipped frames.

## Results Summary
- **Best render time**: 45.630s (vs baseline 47.139s)
- **Improvement**: ~3.2%
- **Kept experiments**: Move closure logic outside CaptureLoop
- **Discarded experiments**: None
