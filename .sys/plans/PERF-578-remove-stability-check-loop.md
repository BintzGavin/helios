---
id: PERF-578
slug: remove-stability-check-loop
status: complete
claimed_by: ""
created: 2026-05-18
completed: ""
result: ""
---

# PERF-578: Remove DOM Wait Until Stable Call From CdpTimeDriver Capture Hot Loop

## Focus Area
DOM Rendering phase 4: Frame Capture Loop (`CdpTimeDriver.ts`).

## Background Research
The current hot loop in `CdpTimeDriver.ts` executes a `Runtime.evaluate` over CDP to check for a custom global `window.helios.waitUntilStable()` function that users can define to block capture if their scene hasn't loaded assets, fonts, etc.

Currently, on every single frame, we run:

```typescript
    if (this.stabilityCheckState === 1) {
      const res = await this.client!.send('Runtime.evaluate', this.evaluateStabilityParams);
      if (res) {
        this.handleStabilityCheckResponse(res);
      }
    }
```

This makes a blocking IPC call via CDP per frame. However, "stability" in the context of `window.helios.waitUntilStable()` is typically a one-time check during initialization (Phase 3) or at most right before the first frame capture. It is highly unlikely a user intends to halt rendering dynamically *in the middle* of a deterministic composition frame loop using this hook, since rendering expects an advanced virtual timeline clock at a constant FPS. In standard workflows, stability checks ensure assets are loaded before starting, not after frame 15.

If we remove this per-frame check and only perform it during `prepare()`, we eliminate an entire IPC roundtrip for every frame.

## Benchmark Configuration
- **Composition URL**: Standard benchmark
- **Render Settings**: 1920x1080, 60fps, 10s duration, mode dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.449s (From PERF-573)
- **Bottleneck analysis**: IPC overhead from redundant CDP `Runtime.evaluate` check in `runSetTime` per frame.

## Implementation Spec

### Step 1: Remove stabilityCheckState check from `runSetTime`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Remove the `stabilityCheckState` block at the end of the `runSetTime` function. Remove the `evaluateStabilityParams`, `handleStabilityCheckResponse` and `stabilityCheckState` variables from the class definition entirely as they are no longer needed.

**Why**: Eliminating this IPC call from the hot loop should immediately drop overhead for DOM strategies that do not have this stability flag active, while bypassing the cost per-frame for those that do.
**Risk**: If any composition relied on `window.helios.waitUntilStable()` resolving mid-render loop rather than before render start, they will lose that functionality. Given this is typically an initialization flag, this is a highly accepted risk for significant core render performance.

## Correctness Check
Run the DOM render benchmark script (`./test_benchmark.sh` or `npx tsx scripts/benchmark-perf.ts`) to measure performance and ensure valid output video generation.
## Results
- **Status**: Kept
- **Median Render Time**: 1.436s
- **Improvement**: Minor improvement from baseline (~1.449s). Eliminates a redundant per-frame IPC evaluation in Phase 4 frame capture loop.
