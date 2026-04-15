---
id: PERF-282
slug: cache-cachedframes
status: unclaimed
claimed_by: ""
created: 2026-04-14
completed: ""
result: ""
---

# PERF-282: Replace Dynamic Closure with Inline Promise Allocation for Seek Time Driver Evaluates

## Focus Area
`packages/renderer/src/drivers/SeekTimeDriver.ts` hot loop, specifically `setTime()`.

## Background Research
Currently in `SeekTimeDriver.ts`, if `frames.length !== 1`, it dynamically allocates an array `this.cachedPromises` and maps `frames[i].evaluate(...)` to each promise, then uses `Promise.all()` over the potentially resized array. The array is updated with `this.cachedPromises = new Array(frames.length)`. We know from earlier experiments (like PERF-280) that V8 struggles when mapping arrays to closures dynamically over frames versus fixed arrays. In Playwright, `page.frames()` length is virtually constant after load for typical animations.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: 1280x720, 30fps, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.071s
- **Bottleneck analysis**: Overhead of evaluating `page.frames()` length and reallocating arrays within `setTime()` hot loop in `SeekTimeDriver.ts`.

## Implementation Spec

### Step 1: Pre-initialize `evaluatePromises`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Inside `prepare()`, pre-allocate `this.cachedPromises = new Array(this.cachedFrames.length)` exactly once instead of doing it defensively per-frame in `setTime()`.

**Why**: By asserting that frame counts are static during the seek/render hot path, we eliminate branching and dynamic array reallocations on every frame `setTime()` iteration.

### Step 2: Remove `frames.length` conditionals in `setTime` loop
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In `setTime`, remove the dynamic `if (this.cachedPromises.length !== frames.length)` resizing logic.

**Why**: Same as above, V8 prefers monomorphic hot paths without resizing or checking array dimensions conditionally inside hot loops.

## Variations
None.

## Canvas Smoke Test
Verify canvas functionality remains intact since this targets `SeekTimeDriver.ts` exclusively.

## Correctness Check
Run the DOM benchmark and ensure frame count remains accurate and visual correctness is retained.
