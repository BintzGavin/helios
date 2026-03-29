---
id: PERF-102
slug: beginframe-compositor-sync
status: complete
claimed_by: "executor-session"
created: 2024-05-25
completed: ""
result: "improved"
---

# PERF-102: Synchronize Compositor Clock via BeginFrame Parameters

## Focus Area
Chromium Engine - Compositor Internal Timing & Rendering Pipeline

## Background Research
In DOM rendering mode, the `SeekTimeDriver` successfully overrides JavaScript time (e.g., `performance.now()`, `Date.now()`, WAAPI, GSAP) to simulate deterministic virtual time for the composition. However, the internal Chromium compositor still relies on real wall-clock time because we currently invoke `HeadlessExperimental.beginFrame` without explicit timing parameters.

Since DOM rendering executes significantly slower than real-time (e.g., generating a 16.6ms frame may take ~100ms of CPU wall-clock time), the compositor incorrectly observes that 100ms have elapsed between consecutive layout/paint ticks. This discrepancy forces the Blink rendering engine to simulate large time deltas, potentially triggering redundant internal animation updates, interpolation, and unnecessary style recalculations to account for the perceived real-time drift.

The `HeadlessExperimental.beginFrame` CDP command accepts explicit `frameTimeTicks` and `interval` parameters. By explicitly providing these values on every frame capture, we perfectly synchronize the compositor's internal clock with our virtual `frameTime`. This strictly confines the engine to processing exactly one frame's worth of work (e.g., 16.6ms), eliminating real-time drift overhead and reducing overall CPU utilization.

## Baseline
- **Current estimated render time**: ~33.376s
- **Bottleneck analysis**: Extraneous CPU cycles spent in Chromium resolving large time deltas during internal layout/paint ticks.

## Implementation Spec

### Step 1: Pass explicit timing to HeadlessExperimental.beginFrame
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `capture` method, calculate explicit `frameTimeTicks` and `interval` before sending the `beginFrame` CDP message. Use an arbitrary base offset (e.g., `10000`) for `frameTimeTicks` to avoid issues with zero-uptime assumptions in the Chromium scheduler. Since `this.options.fps` is available (as `private options: RendererOptions` in the constructor), we can use it.

Modify the `capture` method to explicitly set these parameters on both `this.beginFrameParams` and `this.beginFrameTargetParams` just before sending the CDP message:

```typescript
    const interval = 1000 / this.options.fps;
    const frameTimeTicks = 10000 + frameTime; // Offset by 10 seconds to simulate a stable uptime

    // Assign explicit timings
    this.beginFrameParams.frameTimeTicks = frameTimeTicks;
    this.beginFrameParams.interval = interval;
    if (this.beginFrameTargetParams) {
        this.beginFrameTargetParams.frameTimeTicks = frameTimeTicks;
        this.beginFrameTargetParams.interval = interval;
    }
```

**Why**: Forcing `frameTimeTicks` guarantees that the Chromium compositor perceives the exact elapsed time corresponding to the rendering virtual time (e.g., exactly 16.6ms per frame). This prevents Blink from attempting to simulate or catch up to the slower wall-clock time of the rendering process, mathematically limiting the required layout/paint CPU work per frame.
**Risk**: If `frameTimeTicks` requires a specific OS epoch matching Chromium's actual startup ticks, providing an arbitrary offset might break some internal sub-systems. However, since we're using virtual/deterministic overrides throughout the rest of the stack, passing a monotonically increasing value typically satisfies the compositor.

## Canvas Smoke Test
Run a standard canvas render to ensure nothing breaks in the canvas pipeline.

## Correctness Check
Run the DOM render verify scripts. Watch the generated video output to verify that frame timing remains smooth and CSS animations advance correctly without stuttering or skipping due to compositor clock confusion.

## Results Summary
- **Best render time**: 34.175s (vs baseline 34.866s)
- **Improvement**: 2.0%
- **Kept experiments**: [explicit timing in beginFrame]
- **Discarded experiments**: None
