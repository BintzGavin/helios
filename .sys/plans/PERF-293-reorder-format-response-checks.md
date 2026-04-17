---
id: PERF-293
slug: reorder-format-response-checks
status: unclaimed
claimed_by: ""
created: 2024-05-18
completed: ""
result: ""
---
# PERF-293: Reorder DomStrategy formatResponse checks for CDP hot path

## Focus Area
The hot loop in DOM rendering mode (DOM-to-Video path). Specifically, the `formatResponse` method in `packages/renderer/src/strategies/DomStrategy.ts` which is executed for every single frame captured during the render loop.

## Background Research
During the frame capture loop in `CaptureLoop.ts`, `DomStrategy.formatResponse` is called to extract the image buffer or base64 string from the raw capture response. Currently, the code first checks `if (Buffer.isBuffer(res))` before checking `else if (res && res.screenshotData)`.

Since the DOM strategy uses CDP `HeadlessExperimental.beginFrame` almost exclusively (unless forced into fallback), the response is typically a plain JSON object containing `screenshotData` (a base64 string), not a Node.js `Buffer` object (which is only returned by fallback screenshot or canvas strategies).

Calling `Buffer.isBuffer(res)` on a plain object on every frame involves a function call overhead. By reordering the condition to check for `res && res.screenshotData` first, we replace a function call with a fast V8 hidden-class property access for the vast majority of frames.

## Benchmark Configuration
- **Composition URL**: http://localhost:3000/benchmark
- **Render Settings**: 1920x1080, 60fps, 10s, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.1s
- **Bottleneck analysis**: Micro-optimizing the frame capture loop logic avoids unnecessary function calls in the V8 hot path.

## Implementation Spec

### Step 1: Reorder formatResponse conditions
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Locate the `formatResponse` property assignment in the class.
Change it from:
```typescript
  public formatResponse = (res: any): Buffer | string => {
    if (Buffer.isBuffer(res)) {
      this.lastFrameData = res;
      return res;
    } else if (res && res.screenshotData) {
      this.lastFrameData = res.screenshotData;
      return res.screenshotData;
    } else if (this.lastFrameData) {
      return this.lastFrameData;
    } else {
      this.lastFrameData = this.emptyImageBase64;
      return this.emptyImageBase64;
    }
  };
```
To:
```typescript
  public formatResponse = (res: any): Buffer | string => {
    if (res && res.screenshotData) {
      this.lastFrameData = res.screenshotData;
      return res.screenshotData;
    } else if (Buffer.isBuffer(res)) {
      this.lastFrameData = res;
      return res;
    } else if (this.lastFrameData) {
      return this.lastFrameData;
    } else {
      this.lastFrameData = this.emptyImageBase64;
      return this.emptyImageBase64;
    }
  };
```
**Why**: Avoids the `Buffer.isBuffer` function call on the common CDP path, replacing it with a faster object property access `res.screenshotData`.
**Risk**: Negligible. The logical behavior remains completely unchanged.

## Variations
No variations necessary.

## Canvas Smoke Test
Run `npm run build:examples` or the equivalent canvas smoke tests to ensure Canvas fallback isn't affected.

## Correctness Check
Verify that the output video retains all frames correctly and deterministically.
