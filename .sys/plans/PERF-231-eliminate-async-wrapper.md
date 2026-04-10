---
id: PERF-231
slug: eliminate-async-wrapper
status: complete
claimed_by: "perf-231"
created: 2024-05-28
completed: "2024-05-28"
result: "improved"
---
# PERF-231: Eliminate async wrapper for frame capture loop

## Focus Area
The hot frame capture loop in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, eliminating the `async` wrapper for the `captureWorkerFrame` helper function.

## Background Research
Currently, `captureWorkerFrame` is defined as an `async` arrow function inside `CaptureLoop.ts`. In V8, marking a function as `async` forces it to return a Promise and creates an implicit `async` context, even if the function body could otherwise be executed sequentially with native Promise chaining. Inside the hot loop (executing 60+ times per second per worker), this micro-stall and extra Promise allocation (for the implicit `async` return) creates measurable garbage collection overhead. Refactoring the function to return a natively chained Promise removes this `async` context allocation and slightly reduces GC pressure.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition (e.g., `http://localhost:3000/`)
- **Render Settings**: 1920x1080, 60 FPS, 10 seconds, `libx264` codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.7s
- **Bottleneck analysis**: Micro-allocations from implicit Promise wrappers and `async` context creation in V8 during the core tight loop.

## Implementation Spec

### Step 1: Remove `async` from `captureWorkerFrame`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Remove the `async` keyword from the `captureWorkerFrame` arrow function definition.
2. Rewrite its body to use native Promise chaining instead of `await activePromise`. Return the Promise chain directly instead of creating an implicit async context.
**Why**: Avoids V8 `async` context creation micro-stalls and redundant Promise allocations during the hot frame submission loop.
**Risk**: Potential loss of call stack fidelity during error propagation (though errors inside this specific loop are generally swallowed or bubbled via the returned Promise anyway).

## Canvas Smoke Test
Run the standard Canvas rendering benchmark or a simple Canvas component render to ensure shared renderer logic is not broken.

## Correctness Check
Run the DOM rendering benchmark and visually inspect the output video to ensure timing and frames are still correct.

## Prior Art
- None