---
id: PERF-466
slug: direct-promise-chain
status: complete
claimed_by: "jules"
created: "2024-05-20"
completed: ""
result: "discarded"
---

# PERF-466: Direct Promise Chain in CdpTimeDriver.runSetTime

## Focus Area
The `runSetTime` function in `CdpTimeDriver.ts` is the hot loop function called for each frame in DOM mode. It's defined as an `async` function, which adds `async/await` state machine overhead.

## Background Research
Returning a direct promise chain instead of using `async/await` avoids the allocation of the state machine and can slightly reduce GC churn and microtask overhead in hot loops.

## Benchmark Configuration
- **Composition URL**: standard dom benchmark composition
- **Render Settings**: 1920x1080, 60fps, 10s, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~20.4s
- **Bottleneck analysis**: Microtask and state machine overhead in hot loop.

## Implementation Spec

### Step 1: Replace async runSetTime
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**: Change `private async runSetTime` to return a direct promise chain.
**Why**: Avoid `async/await` state machine overhead.
**Risk**: Potential unhandled rejections if errors are thrown synchronously before the promise chain starts.

## Results Summary
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	24.061	600	24.94	4.5	discard	direct promise chain in runSetTime
2	23.913	600	25.09	4.5	discard	direct promise chain in runSetTime
3	22.733	600	26.39	4.5	discard	direct promise chain in runSetTime
