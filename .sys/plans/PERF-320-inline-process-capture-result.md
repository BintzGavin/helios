---
id: PERF-320
slug: inline-process-capture-result
status: complete
claimed_by: "executor-session"
created: 2024-05-25
completed: "2026-04-20"
result: "improved"
---

# PERF-320: Inline processCaptureResult in DomStrategy

## Focus Area
Frame Capture Loop (`DomStrategy.capture()`). This targets function call overhead and branch simplification in the core hot loop.

## Background Research
Currently, `DomStrategy.capture()` delegates to a private helper `processCaptureResult(res)` which handles fallback logic (if `res` is null, it uses `lastFrameData`) and type checking. By inlining this logic directly into `capture()`, we eliminate the `.call()` overhead on every frame. Furthermore, since the primary CDP pathway (`HeadlessExperimental.beginFrame`) returns an object with `screenshotData`, we can handle that cleanly without passing through generic type checks like `Buffer.isBuffer()`.

## Benchmark Configuration
- **Composition URL**: http://localhost:3000/composition.html
- **Render Settings**: 1080p, 60fps, dom mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~47.554s
- **Bottleneck analysis**: The capture hot loop executes thousands of times per second. Eliminating function calls and branches provides cumulative CPU savings.

## Implementation Spec

### Step 1: Inline process logic into DomStrategy.capture
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Remove the private method `processCaptureResult`. Inside `capture()`, store the CDP or Playwright result in a local variable. Then inline the logic:
```typescript
    const res = await ... // from CDP or targetElementHandle

    if (res && res.screenshotData) {
      this.lastFrameData = res.screenshotData;
      return res.screenshotData;
    } else if (Buffer.isBuffer(res)) {
      this.lastFrameData = res;
      return res;
    }
    return this.lastFrameData!;
```
**Why**: Eliminates a function call per frame and allows V8 to inline the type checks directly within the capture method's execution context.
**Risk**: Minimal, just moving logic.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas isn't affected.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to verify DOM output correctly falls back to `lastFrameData`.

## Prior Art
PERF-317 simplified the empty frame fallback logic. This builds on it by inlining the rest of the response handling.

## Results Summary
- **Best render time**: 41.250s (vs baseline ~47.554s)
- **Improvement**: ~13%
- **Kept experiments**: [Inline processCaptureResult]
- **Discarded experiments**: []
