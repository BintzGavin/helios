---
id: PERF-119
slug: independent-strategies
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-119: Independent Strategies per Worker

## Focus Area
The Playwright worker pool inside `packages/renderer/src/Renderer.ts` shares a single strategy instance, which blocks scaling out DOM capture concurrency and causes "Another frame is pending" crashes.

## Background Research
Currently, `Renderer.ts` instantiates a single `RenderStrategy` (`this.strategy`) in its constructor. When `Renderer.render` sets up the worker pool of Playwright pages, it uses the expression:
```typescript
const strategy = this.strategy || (this.options.mode === 'dom' ? new DomStrategy(this.options) : new CanvasStrategy(this.options));
```
Because `this.strategy` is truthy, all workers receive the exact same `DomStrategy` instance.

In `DomStrategy.ts`, the CDP session (`this.cdpSession = await page.context().newCDPSession(page);`) is saved as a class property. Because all workers share the same `DomStrategy` instance, each new worker overwrites the shared `cdpSession`. During the `captureLoop`, multiple workers concurrently call `strategy.capture()`, which issues `HeadlessExperimental.beginFrame` commands to the *last instantiated* CDP session. This forces Chromium to process multiple simultaneous frames for the same page, leading to a race condition and a `cdpSession.send: Protocol error (HeadlessExperimental.beginFrame): Another frame is pending` crash.

Fixing this by instantiating an independent `DomStrategy` and `TimeDriver` for each Playwright page is the critical step to unlocking true multi-core DOM capture concurrency.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: Standard benchmark resolution and framerate
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 33.394s (Single worker effective concurrency due to lock)
- **Bottleneck analysis**: Workers are bottlenecked on a single CDP session lock, defeating parallel pool setup.

## Implementation Spec

### Step 1: Remove shared state from the worker setup
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Inside `Renderer.render`'s `createPage` function, replace the `strategy` and `timeDriver` assignment with fresh instantiations for every worker:
```typescript
const strategy = this.options.mode === 'dom' ? new DomStrategy(this.options) : new CanvasStrategy(this.options);
const timeDriver = this.options.mode === 'dom' ? new SeekTimeDriver(this.options.stabilityTimeout) : new CdpTimeDriver(this.options.stabilityTimeout);
```
Remove `this.strategy ||` logic so every page gets its own strategy.

Also, modify `diagnose()` to instantiate its own local strategy to test against, instead of relying on `this.strategy`.
```typescript
const strategy = this.options.mode === 'dom' ? new DomStrategy(this.options) : new CanvasStrategy(this.options);
const browserDiagnostics = await strategy.diagnose(page);
```

Modify `Renderer.render` to retrieve FFmpeg args from the first worker's strategy:
```typescript
const { args, inputBuffers } = pool[0].strategy.getFFmpegArgs(this.options, outputPath);
```

### Step 2: Clean up the class properties
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Remove `private strategy: RenderStrategy;` and `private timeDriver: TimeDriver;` properties from the `Renderer` class definition and constructor entirely. They should not be shared across the instance.

### Step 3: Enable deep pipelining (Concurrency scaling)
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Now that strategies are independent and the "Another frame is pending" issue is resolved, verify `maxPipelineDepth` inside the `captureLoop` is set to effectively utilize the workers. Ensure it remains at `poolLen * 2` (or greater) to keep the Chromium queues saturated.

## Variations
None. This is a strict architectural fix required for concurrency.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas path works with independent strategies.

## Correctness Check
Run the `packages/renderer/tests/fixtures/benchmark.ts` to verify DOM output is correct and measure the unlocked concurrency speedup.
