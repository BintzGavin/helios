---
id: PERF-557
slug: pre-evaluate-stability
status: complete
claimed_by: "Jules"
created: 2024-05-20
completed: "2024-05-20"
result: "discarded"
---

# PERF-557: Pre-evaluate Stability State in CdpTimeDriver

## Focus Area
`CdpTimeDriver.ts` hot loop (`runSetTime`).

## Background Research
In the deterministic DOM rendering pipeline, `CdpTimeDriver.ts` uses `runSetTime` to advance the virtual time and trigger frame captures. Currently, inside this hot loop, there is a conditional block that checks if `stabilityCheckState === 0` (which is true on the first frame). If so, it performs an asynchronous CDP `Runtime.evaluate` to determine if a stability function (`waitUntilStable`) exists on the page.

Since the `window.__helios_wait_until_stable` proxy function is injected synchronously during the `init`/`prepare` phase, and user compositions typically define `window.helios.waitUntilStable` globally during page load, there is no need to defer this evaluation to the hot frame loop. Moving this initial check into the `prepare` phase (before the loop starts) will eliminate a branching condition and an asynchronous CDP roundtrip from the critical path of the first frame capture.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark composition
- **Render Settings**: 600 frames, 60fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~10.002s
- **Bottleneck analysis**: Microtask scheduling and CDP roundtrips in the deterministic hot loop.

## Implementation Spec

### Step 1: Pre-evaluate Stability State
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Remove the `if (this.stabilityCheckState === 0)` block from the `runSetTime` method.
2. Move that exact `try...catch` and `Runtime.evaluate` logic into the end of the `prepare` method, replacing the `this.stabilityCheckState = 0;` assignment.
**Why**: Moving this check to the preparation phase removes a branching condition and an asynchronous CDP call from the hot frame loop, ensuring the loop executes as fast as possible from frame 1.
**Risk**: If the user's `waitUntilStable` function is injected asynchronously *after* `prepare` finishes but *before* `runSetTime` starts, it might be missed. However, the framework standard is to define it at load time, minimizing this risk.

## Correctness Check
Run the full test suite (`npm run test -w packages/renderer -- --run`) to verify the time driver still functions correctly and stability checks are respected.
## Results Summary

| run | render_time_s | frames | fps_effective | peak_mem_mb | status | description |
|-----|---------------|--------|---------------|-------------|--------|-------------|
| 1   | 0.100         | N/A    | N/A           | N/A         | discard | Simulated loop advance |
| 2   | 0.100         | N/A    | N/A           | N/A         | discard | Simulated loop advance |
| 3   | 0.101         | N/A    | N/A           | N/A         | discard | Simulated loop advance |

*Note: The actual capture pipeline crashed with integration resolution errors (`@helios-project/core` unable to resolve `TimeDriver`) due to lifecycle mutations, preventing a full composition render. The render times logged above reflect the CDP test suite's simulated virtual time advance, which showed no improvement over baseline.*
