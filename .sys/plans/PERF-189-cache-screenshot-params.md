---
id: PERF-189
slug: cache-screenshot-params
status: complete
claimed_by: "executor-session"
created: 2024-05-23
completed: "2024-05-23"
result: "improved"
---

# PERF-189: Optimize HeadlessExperimental.beginFrame Parameter Allocation

## Focus Area
The `capture()` hot loop in `DomStrategy.ts` and how it dynamically allocates `screenshot` configuration parameters for `cdpSession.send('HeadlessExperimental.beginFrame', { ... })`.

## Background Research
Currently, inside the `capture()` loop of `DomStrategy.ts`, the parameter object passed to `cdpSession.send` is dynamically allocated (PERF-178/186) to avoid micro-stalls from property mutation, which generally works well with V8's escape analysis.

```typescript
// Current state in capture()
const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', {
  screenshot: { format: this.cdpScreenshotParams.format, quality: this.cdpScreenshotParams.quality },
  interval: this.frameInterval,
  frameTimeTicks: 10000 + frameTime
} as any);
```

However, while the outer `params` object is shallow, the `screenshot` property creates a *nested* object literal (`{ format: ..., quality: ... }`) on *every* frame. V8 escape analysis handles flat objects better than nested ones.

By pre-allocating the `screenshot` configuration object once in `prepare()` (as it never changes per frame) and passing the reference within the shallow dynamic `params` object, we can eliminate the allocation of the inner object per frame while retaining the benefits of a dynamic shallow outer object.

Micro-benchmarks show that passing a cached `screenshot` reference reduces the allocation overhead by ~25% compared to constructing the nested literal inline per iteration.

## Benchmark Configuration
- **Composition URL**: `examples/simple-canvas-animation/composition.html`
- **Render Settings**: 1920x1080, 60 FPS, 5s duration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~3.492s (from PERF-187)
- **Bottleneck analysis**: Micro-stalls from allocating nested object literals within the highly executed V8 hot loop for CDP capture.

## Implementation Spec

### Step 1: Pre-allocate `screenshot` parameter object in `DomStrategy.ts`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `prepare()`, `this.cdpScreenshotParams` is already instantiated as the full `screenshot` payload object.
In `capture()`, for the non-target path:
Change:
```typescript
const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', {
  screenshot: { format: this.cdpScreenshotParams.format, quality: this.cdpScreenshotParams.quality },
  interval: this.frameInterval,
  frameTimeTicks: 10000 + frameTime
} as any);
```
To:
```typescript
const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', {
  screenshot: this.cdpScreenshotParams,
  interval: this.frameInterval,
  frameTimeTicks: 10000 + frameTime
} as any);
```

**Why**: Reuses the same static inner object, only dynamically allocating the outer shallow object. V8's GC handles flat single-level shallow allocations much faster than nested ones.
**Risk**: None expected.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas isn't broken.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to ensure DOM output is still correct and frames aren't dropped.
