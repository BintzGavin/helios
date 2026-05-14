---
id: PERF-501
slug: inline-cdp-screenshot-params
status: complete
claimed_by: "jules"
created: 2024-05-14
completed: "2024-05-14"
result: "discard"
---

# PERF-501: Inline CDP Screenshot Params

## Focus Area
DOM Capture Pipeline (`DomStrategy.ts`). Targeting the per-frame overhead when calling `HeadlessExperimental.beginFrame` by minimizing the parameter object's prototype chain and properties.

## Background Research
Currently in `DomStrategy.ts`, `beginFrameParams` references `cdpScreenshotParams` via `this.beginFrameParams.screenshot = cdpScreenshotParams;`. In V8, when an object is passed to a C++ binding (like the CDP session sender), the engine must serialize the JS object to a native format (JSON). By creating a flat or strictly-typed object literal, or combining the parameters directly within the `beginFrameParams` structure without nested object references, we might shave off microseconds per frame in the serialization step.

## Baseline
- **Current estimated render time**: ~17.6s - 18.2s for 600 frames
- **Bottleneck analysis**: IPC payload construction and V8 JSON serialization overhead.

## Implementation Spec

### Step 1: Inline Screenshot Params into Begin Frame Params
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Instead of defining `cdpScreenshotParams` and assigning it to `this.beginFrameParams.screenshot`, assign the properties directly. Update `this.beginFrameParams` initialization to explicitly list all properties up front.

**Why**: Reducing object depth and nested references can speed up V8 JSON serialization for CDP calls.

**Risk**: Potential type errors if the CDP schema strictly expects a nested `screenshot` object instead of flattened parameters. We must ensure the CDP `beginFrame` spec accepts the new format.

## Correctness Check
Run the benchmark and ensure `output.mp4` is valid.

## Canvas Smoke Test
Run a basic canvas test to ensure no breakage.
## Results Summary
| run | render_time_s | frames | fps_effective | peak_mem_mb | status | description |
|-----|---------------|--------|---------------|-------------|--------|-------------|
| 1   | 18.321        | 600    | 32.75         | 39.4        | discard| Inline CDP Screenshot Params |
