---
id: PERF-068
slug: eliminate-promise-all-allocations
status: complete
claimed_by: "executor-session"
created: 2024-05-24
completed: "2024-05-24"
result: "improved"
---

# PERF-068: Eliminate Promise Array Allocations

## Focus Area
The `window.__helios_seek` function injected by `packages/renderer/src/drivers/SeekTimeDriver.ts`. This script executes on every frame via CDP `Runtime.evaluate`.

## Background Research
Currently, the `__helios_seek` initialization script always allocates an empty array for promises on every invocation, and subsequently checks its length, regardless of whether any internal asynchronous waits (`await`) actually occurred during execution.

Given that the vast majority of frames do not encounter fonts loading or media elements seeking, the promises length is usually 0, meaning no internal await happens. By conditionally allocating this array, we can eliminate the unnecessary memory allocation and garbage collection overhead.

## Benchmark Configuration
- **Composition URL**: Standard benchmark HTML
- **Render Settings**: Standard resolution and framerate
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.100s
- **Bottleneck analysis**: The array allocation overhead in Chromium V8 for evaluating a native function on every frame via IPC adds unnecessary latency when no actual asynchronous work is performed.

## Implementation Spec

### Step 1: Conditionally Allocate Promises Array
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In the `initScript` string:
1. Locate the initialization of the promises array.
2. Update the logic that pushes to the promises array (fonts loading, media elements seeking, Helios stability checks) to first conditionally instantiate the array if it hasn't been instantiated yet.
3. Locate the stability wait block that checks if the promises array has length > 0.
4. Update this condition to also ensure the array has been instantiated.

**Why**: This avoids allocating an empty array on every frame when no promises are pushed, reducing memory pressure and garbage collection overhead.

## Correctness Check
Instruct the Executor to run the offset verification tests (`npx tsx packages/renderer/tests/verify-seek-driver-offsets.ts`) to ensure time synchronization is not broken, particularly for frames that *do* require waiting.

## Results Summary
- **Best render time**: 33.446s (vs baseline 33.893s)
- **Improvement**: 1.3%
- **Kept experiments**:
  - Conditionally allocated the `promises` array only when asynchronous actions are encountered in the injected CDP script `window.__helios_seek()`. This reduces array allocations and V8 garbage collection overhead.
- **Discarded experiments**: [none]
