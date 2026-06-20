---
id: PERF-807
slug: monomorphic-base64
status: unclaimed
claimed_by: ""
created: 2024-06-20
completed: ""
result: ""
---
# PERF-807: Monomorphic Base64 Frame Data in DomStrategy

## Focus Area
DOM Rendering Pipeline - `DomStrategy.ts` frame data initialization.

## Background Research
Currently, `DomStrategy` initializes `this.lastFrameData` to `this.emptyImageBuffer` (which is a Node.js `Buffer`). During capture, if CDP does not return `screenshotData` (e.g., empty or unchanged frames), it returns this initial `Buffer`. However, when CDP does return `screenshotData`, it assigns and returns a Base64 `string`.
Because `lastFrameData` alternates between a `Buffer` and a `string`, the `buffer` variable inside the `CaptureLoop.ts` fast path becomes polymorphic. This causes the `typeof buffer === 'string'` check to be unpredictable and forces the underlying `stream.write()` to handle multiple types, degrading V8 TurboFan's ability to optimize the write path into a monomorphic inline cache.

By simply initializing `this.lastFrameData = this.emptyImageBase64` instead, `DomStrategy` will strictly and exclusively yield Base64 strings across all frames. This makes the return type monomorphic, allowing V8 to heavily optimize the write loop branch prediction and inline the `stream.write(string, 'base64')` path without deoptimizations.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.948s
- **Bottleneck analysis**: Polymorphic return types (`Buffer` vs `string`) from `DomStrategy.capture()` degrading V8 loop optimizations in `CaptureLoop.ts`.

## Implementation Spec

### Step 1: Initialize `lastFrameData` as a Base64 string
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `prepare()` method of `DomStrategy.ts`, change the initialization of `this.lastFrameData` from `this.emptyImageBuffer` to `this.emptyImageBase64`.

```typescript
<<<<<<< SEARCH
    }

    this.lastFrameData = this.emptyImageBuffer;




    if (this.options.targetSelector) {
=======
    }

    this.lastFrameData = this.emptyImageBase64;




    if (this.options.targetSelector) {
>>>>>>> REPLACE
```
**Why**: Ensures `lastFrameData` starts as a string, matching the type of `result.screenshotData`, making the frame stream fully monomorphic.
**Risk**: None, `CaptureLoop` already supports string base64 natively.

## Variations
None.

## Correctness Check
Run the `npm run build` and `npx tsx scripts/benchmark-perf.ts --mode dom` to verify that frames are still correctly written to the FFmpeg pipe without corruption.
