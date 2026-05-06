---
id: PERF-440
slug: inline-begin-frame-params
status: unclaimed
claimed_by: ""
created: 2024-05-28
completed: ""
result: ""
---

# PERF-440: Inline beginFrame parameter allocation in DomStrategy

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts` - `capture` hot loop

## Background Research
In V8, creating object literals inside a hot loop is optimized incredibly well by Turbofan. In PERF-348, it was proven that inline object literal allocation is consistently ~10-15% faster than mutating a cached object in a tight loop because it avoids write-barrier overhead.
Currently in `DomStrategy.ts`, we mutate a preallocated object `this.beginFrameParams.frameTimeTicks = 10000 + frameTime;` before sending it to the CDP via `HeadlessExperimental.beginFrame`.
This experiment will change it to inline object allocation.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10 duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.776s
- **Bottleneck analysis**: The micro-allocation of V8 GC write barriers during property mutation of long-lived objects inside a hot loop.

## Implementation Spec

### Step 1: Use Inline Allocation in `DomStrategy.ts`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Remove `beginFrameParams` class property.
2. In `prepare()`, remove its initialization.
3. In `capture()`, instead of mutating the properties, inline the object creation:

For standard begin frame:
```typescript
    const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', {
      screenshot: this.cdpScreenshotParams,
      interval: this.frameInterval,
      frameTimeTicks: 10000 + frameTime
    });
```

**Why**: Using inline literal object allocation avoids V8 old-space-to-new-space GC write barriers and is measurably faster than mutating properties on a cached object in a tight loop.

## Variations
None.

## Canvas Smoke Test
Ensure Canvas mode works (since it uses `CdpTimeDriver`).

## Correctness Check
Run the DOM render benchmark script multiple times to verify median render time improvement and ensure generated `output.mp4` contains 600 correct frames.
