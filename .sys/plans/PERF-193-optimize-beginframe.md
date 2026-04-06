---
id: PERF-193
slug: optimize-beginframe
status: unclaimed
claimed_by: ""
created: 2026-04-06
completed: ""
result: ""
---

# PERF-193: Optimize HeadlessExperimental.beginFrame parameters caching in DomStrategy capture loop

## Focus Area
DOM Rendering Pipeline hot loop inside packages/renderer/src/strategies/DomStrategy.ts.

## Background Research
In the `DomStrategy.ts` `capture()` method, which executes per frame per worker, the image data is requested via CDP using `HeadlessExperimental.beginFrame`. The parameters object passed to this method is constructed as an object literal in the hot loop, but it was noted in PERF-178 and PERF-189 that this causes dynamic object allocation and garbage collection overhead. While `screenshot` object parameter is cached via `this.cdpScreenshotParams`, the outer object literal itself is still allocated for every frame.
By creating a pre-allocated object and mutating only the `frameTimeTicks` property inside the loop, we can avoid this literal allocation entirely.

## Benchmark Configuration
- Composition URL: file:///app/examples/simple-animation/composition.html
- Render Settings: 1280x720, 30fps, 5 seconds (150 frames)
- Mode: dom
- Metric: Wall-clock render time in seconds
- Minimum runs: 3 per experiment, report median

## Baseline
- Current estimated render time: ~33.6s
- Bottleneck analysis: GC pressure and object allocation overhead from literal initialization in the hot loop.

## Implementation Spec

### Step 1: Pre-allocate beginFrame params
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Add `private beginFrameParams: any = null;` to the class properties.
2. In the `prepare` method, after defining `this.frameInterval` and `this.cdpScreenshotParams`, initialize `this.beginFrameParams`:
```typescript
    this.beginFrameParams = {
      screenshot: this.cdpScreenshotParams,
      interval: this.frameInterval,
      frameTimeTicks: 0
    };
```
3. In the `capture` method, instead of allocating a new object literal for the `cdpSession!.send` fallback branch, update `frameTimeTicks` on the pre-allocated object and pass it:
```typescript
    this.beginFrameParams.frameTimeTicks = 10000 + frameTime;
    const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
```

**Why**: By avoiding creating a new object literal per frame, we reduce V8 dynamic object allocation and subsequent garbage collection overhead.
**Risk**: If parameters are somehow modified unexpectedly or reused concurrently by multiple calls, it could introduce race conditions. However, since the strategy capture logic operates sequentially for a given page worker, mutating `beginFrameParams` is safe.

## Variations

### Variation A: Implement in Target Selection Path
Also implement the caching in the target selection fallback branch if the object allocation there becomes a bottleneck.

## Canvas Smoke Test
N/A - This only affects DOM mode.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-cdp-driver.ts` to verify DOM rendering still functions properly.
Run `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to verify the DOM rendering still succeeds and produces a valid output.

## Prior Art
- PERF-178: Inline parameter construction for cdpSession.send
- PERF-189: Cache HeadlessExperimental.beginFrame Parameters
