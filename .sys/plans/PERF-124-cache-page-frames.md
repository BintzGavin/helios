---
id: PERF-124
slug: cache-page-frames
status: unclaimed
claimed_by: ""
created: 2026-03-31
completed: ""
result: ""
---
# PERF-124: Optimize Playwright Page Object Model overhead by bypassing `page.frames()` array allocation

## Focus Area
The `setTime` function inside `packages/renderer/src/drivers/SeekTimeDriver.ts`.

## Background Research
During the hot frame capture loop, `Renderer.ts` calls `worker.timeDriver.setTime(worker.page, compositionTimeInSeconds)` for every frame.
Inside `SeekTimeDriver.ts`, the very first operation is:
`const frames = page.frames();`

`page.frames()` in Playwright creates and returns a new array containing all `Frame` objects currently attached to the page. This means on every single frame of a 60fps render, Playwright's object model is queried, and a new Array is allocated and populated, creating V8 Garbage Collection pressure.

For 99% of render compositions, there is only a single main frame (the top-level document). If a composition uses iframes, the `page.frames()` length will be > 1. But the number of frames does not change during the render loop.

If we cache the frames array inside `SeekTimeDriver` during `prepare()`, we eliminate the `page.frames()` array allocation and Playwright IPC lookup entirely from the hot loop.

## Benchmark Configuration
- **Composition URL**: Standard benchmark fixture
- **Render Settings**: 150 frames, dom mode, 1280x720
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.4s
- **Bottleneck analysis**: Continuous allocations of the `page.frames()` array during the hot loop in `SeekTimeDriver` generate GC pressure.

## Implementation Spec

### Step 1: Cache `frames` in `SeekTimeDriver.ts`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
1. Add a private property to the class: `private cachedFrames: Frame[] = [];`
2. In the `prepare(page: Page)` method (which is called exactly once before capture begins), initialize it:
   `this.cachedFrames = page.frames();`
3. In the `setTime(page: Page, timeInSeconds: number)` method, replace `const frames = page.frames();` with:
   `const frames = this.cachedFrames.length > 0 ? this.cachedFrames : page.frames();`

**Why**: This completely removes the Playwright array allocation from the critical hot loop, reducing V8 GC micro-stalls and object churn.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode still works.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-frame-count.ts` to ensure DOM frames render properly.
