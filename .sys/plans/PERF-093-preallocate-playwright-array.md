---
id: PERF-093
slug: preallocate-playwright-array
status: complete
claimed_by: "executor-session"
created: 2026-03-29
completed: ""
result: "discarded"
---

# PERF-093: Preallocate frames in evaluate loop in Playwright context

## Focus Area
V8 Garbage Collection pressure and dynamic array `.push()` overhead.

## Background Research
According to system memory, when refactoring `Promise.all(frames.map(frame => frame.evaluate(...)))` to a `for` loop that pushes to an array in Playwright contexts, declaring the target array as `Promise<any>[]` instead of `Promise<void>[]` prevents TypeScript compilation errors (`Promise<unknown> is not assignable to Promise<void>`). Preallocating the array using `new Array(frames.length)` avoids dynamic `.push()` allocations. Let's see if this optimization can be applied somewhere in the hot paths, for instance in the drivers.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: Fixed resolution, FPS, duration, and codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.376s (as of PERF-092)

## Implementation Spec

### Step 1: Optimize driver loops
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts` or `CdpTimeDriver.ts`
**What to change**:
Locate where we are using `frames.map` or dynamically pushing to arrays for `frame.evaluate` calls. Use pre-allocated `Promise<any>[]` arrays instead.

**Why**: Preallocating avoids V8 array resize allocations and GC churn.

## Variations
None.

## Verification
- Test compilation and tests


## Results Summary
- **Best render time**: 32.479s (vs baseline 33.376s)
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [PERF-093]
