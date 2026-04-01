---
id: PERF-141
slug: remove-cdp-session-check-overhead
status: complete
claimed_by: "executor-session"
created: 2024-05-24
completed: 2024-05-24
result: improved
---
# PERF-141: Remove CDP Session Check Overhead in TimeDrivers

## Focus Area
Frame capture hot loop (`setTime` calls in `SeekTimeDriver.ts` and `CdpTimeDriver.ts`).

## Background Research
In the `setTime` method of `SeekTimeDriver.ts` and `CdpTimeDriver.ts`, there is an explicit check for `if (this.cdpSession)` or `if (this.client)` on every frame. Since the drivers are inherently initialized with these properties during the `prepare()` phase before the frame capture loop starts, repeatedly checking their truthiness inside the hot loop adds minor branch prediction overhead in V8. While V8 handles static branching efficiently, explicitly bypassing it by moving the fallback code or assuming truthiness (since an error would be caught safely by the top-level loop) reduces bytecode size for the hot path.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: Baseline identical settings across all runs
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.057s
- **Bottleneck analysis**: Micro-optimizing execution branching inside the Node-to-Chromium IPC hot loop.

## Implementation Spec

### Step 1: Remove truthiness checks for cdpSession/client
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts` and `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. In `SeekTimeDriver.ts`, remove the `if (this.cdpSession)` blocks. We know the `cdpSession` is initialized because `prepare()` runs before `captureLoop`. We can assert it using the non-null assertion operator `this.cdpSession!` and remove the else branches that fallback to `frame.evaluate`.
2. In `CdpTimeDriver.ts`, remove the `if (!this.client)` guard at the beginning of `setTime()` and use `this.client!.once(...)` later.

**Why**: Eliminating branching inside the hot loop reduces V8 bytecode processing and execution stalls, potentially yielding minor improvements.
**Risk**: If `setTime` is somehow called before `prepare`, it will throw a null reference error instead of a custom error or fallback, but this breaks the interface contract anyway.

## Correctness Check
Run the renderer benchmark script `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to verify the DOM rendering still succeeds.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode still works properly.
