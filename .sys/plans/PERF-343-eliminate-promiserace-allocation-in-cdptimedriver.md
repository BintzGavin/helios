---
id: PERF-343
slug: eliminate-promiserace-allocation-in-cdptimedriver
status: complete
claimed_by: "Jules"
created: 2024-05-24
completed: "2026-04-23"
result: "keep"
---

# PERF-343: Eliminate Promise.race Array Allocation in CdpTimeDriver

## Focus Area
`CdpTimeDriver.ts` single-frame execution hot path, specifically the stability check timeout logic.

## Background Research
During single-frame evaluation within the capture loop, `CdpTimeDriver.setTime()` uses `Promise.race([ this.client!.send(...).then(...), timeoutPromise ])`. Every execution of `Promise.race` allocates a new Array to hold the promises, a new internal Promise for the race itself, and the inline `.then` allocates another closure. This causes unnecessary garbage collection pressure per frame. By manually racing the promises using a prebound class method or structurally eliminating the array allocation, we can reduce V8 GC churn in this hot loop.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080, 60fps, 600 frames
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: N/A
- **Bottleneck analysis**: Repeated array and Promise allocations from `Promise.race` inside the hot loop add unnecessary garbage collection pressure per frame.

## Implementation Spec

### Step 1: Eliminate `Promise.race` and inline closures
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Remove the usage of `Promise.race([ ... ])` and the array allocation in `setTime()`.
2. Instead of `Promise.race`, implement a manual race using a shared state object or prebound handlers to track resolution, avoiding the `[]` array literal allocation entirely.
**Why**: Avoids dynamic array allocation and the internal Promise wrapping overhead of `Promise.race()`.
**Risk**: Requires careful state tracking to ensure timeouts clear correctly and errors propagate without unhandled rejections.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts`

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts`

## Prior Art
- PERF-341 (Prebind stability timeout executor)
