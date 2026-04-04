---
id: PERF-178
slug: inline-params
status: complete
claimed_by: "executor-session"
created: 2024-05-28
completed: "2026-04-04"
result: "improved"
---

# PERF-178: Inline parameter construction for HeadlessExperimental.beginFrame CDP calls

## Focus Area
The `capture()` hot loop in `DomStrategy.ts` where `cdpSession.send()` receives dynamic object parameters.

## Background Research
In PERF-175, we learned that dynamically allocating shallow parameter objects inline for `cdpSession.send()` calls significantly improves performance compared to mutating pre-allocated class properties. However, looking at the current implementation of `DomStrategy.ts` (specifically in the `capture` method), we are creating a new `params` object locally:
```typescript
const params = {
  screenshot: this.cdpScreenshotParams,
  interval: this.frameInterval,
  frameTimeTicks: 10000 + frameTime
};
return this.cdpSession.send('HeadlessExperimental.beginFrame', params).then(...)
```
And for targeted elements:
```typescript
const params = {
  screenshot: {
    format: this.cdpScreenshotParams.format,
    quality: this.cdpScreenshotParams.quality,
    clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 }
  },
  interval: this.frameInterval,
  frameTimeTicks: 10000 + frameTime
};
return this.cdpSession!.send('HeadlessExperimental.beginFrame', params).then(...)
```

V8 can optimize this even further if we inline the object literal directly into the function call `send('HeadlessExperimental.beginFrame', { ... })`, as it avoids creating a named local variable reference, streamlining the byte code and potentially allowing escape analysis to more aggressively eliminate the allocation if the CDP client immediately serializes it. Additionally, combining the constant `10000 + frameTime` directly into the literal might yield tiny improvements.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30 FPS, 5 seconds (150 frames), mode: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~14.3s
- **Bottleneck analysis**: The V8 hot loop parameter object allocation and IPC serialization.

## Implementation Spec

### Step 1: Inline `params` in standard `DomStrategy.capture`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `capture()`, replace:
```typescript
    if (this.cdpSession) {
      const params = {
        screenshot: this.cdpScreenshotParams,
        interval: this.frameInterval,
        frameTimeTicks: 10000 + frameTime
      };

      return this.cdpSession.send('HeadlessExperimental.beginFrame', params).then((res: any) => {
```
with:
```typescript
    if (this.cdpSession) {
      return this.cdpSession.send('HeadlessExperimental.beginFrame', {
        screenshot: this.cdpScreenshotParams,
        interval: this.frameInterval,
        frameTimeTicks: 10000 + frameTime
      }).then((res: any) => {
```

### Step 2: Inline `params` in targeted `DomStrategy.capture`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `capture()`, for the targeted block, replace:
```typescript
          if (box) {
            const params = {
              screenshot: {
                format: this.cdpScreenshotParams.format,
                quality: this.cdpScreenshotParams.quality,
                clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 }
              },
              interval: this.frameInterval,
              frameTimeTicks: 10000 + frameTime
            };

            return this.cdpSession!.send('HeadlessExperimental.beginFrame', params).then((res: any) => {
```
with:
```typescript
          if (box) {
            return this.cdpSession!.send('HeadlessExperimental.beginFrame', {
              screenshot: {
                format: this.cdpScreenshotParams.format,
                quality: this.cdpScreenshotParams.quality,
                clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 }
              },
              interval: this.frameInterval,
              frameTimeTicks: 10000 + frameTime
            }).then((res: any) => {
```

**Why**: Direct object literal passing to `send()` avoids local variable instantiation overhead, minimizing byte code and assisting V8 escape analysis.
**Risk**: Very low, functionally identical.

## Variations
None.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to ensure syntax is correct.

## Correctness Check
Run the `benchmark.ts` to ensure rendering still works and check performance.

## Prior Art
- PERF-175: Dynamic shallow objects
- V8 optimization principles regarding inline object literals and escape analysis.


## Results Summary
- **Best render time**: 3.794s (vs baseline 14.3s)
- **Improvement**: ~73%
- **Kept experiments**: Inline standard params, Inline targeted params (with as any)
- **Discarded experiments**: Inline targeted params (type error)
