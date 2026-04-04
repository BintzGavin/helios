---
id: PERF-177
slug: eliminate-destructuring
status: unclaimed
claimed_by: ""
created: 2024-05-28
completed: ""
result: ""
---
# PERF-177: Eliminate Destructuring and Rest Params in Frame Handling

## Focus Area
DOM Rendering capture hot loop in `DomStrategy.ts`. Optimizing the dynamic object creation for `HeadlessExperimental.beginFrame` parameters.

## Background Research
In the hot loop, each frame captured returns a CDP response object which was previously destructured inline:

```typescript
return this.cdpSession.send('HeadlessExperimental.beginFrame', params).then(({ screenshotData }: any) => {
  if (screenshotData) {
    const buffer = this.writeToBufferPool(screenshotData);
    ...
```

Although V8 optimizes destructuring relatively well, executing it repeatedly across 100,000s of frame captures inside async boundaries allocates short-lived object environment structures. Earlier tests (like PERF-161) attempted to remove destructuring for `DomStrategy`, but we also want to eliminate intermediate class property mutations (as seen in PERF-175) to achieve maximum performance.
Furthermore, we should implement a shallow, dynamically allocated parameter object rather than modifying pre-allocated or spread objects (PERF-176 attempts proved dynamic shallow references are safe and slightly faster than spreads or class mutations).

```typescript
        return this.targetElementHandle.boundingBox().then((box: any) => {
          if (box) {
            const params = {
              screenshot: {
                ...this.cdpScreenshotParams,
                clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 }
              },
              interval: this.frameInterval,
              frameTimeTicks: 10000 + frameTime
            };
```

This uses the spread operator `...this.cdpScreenshotParams`. The spread operator is heavily unoptimized inside high-frequency async loops. By replacing this with a shallow explicit property assignment, we can reduce allocation overhead significantly.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.8s
- **Bottleneck analysis**: Spread operator allocations and destructuring overhead in `DomStrategy.capture`.

## Implementation Spec

### Step 1: Optimize target capture parameters
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `capture()`, inside the `if (box)` condition, replace the `params` object that uses the spread operator with explicit shallow property assignment, and remove `({ screenshotData })` destructuring.

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

            return this.cdpSession!.send('HeadlessExperimental.beginFrame', params).then((res: any) => {
              if (res && res.screenshotData) {
                const buffer = this.writeToBufferPool(res.screenshotData);
                this.lastFrameBuffer = buffer;
                return buffer;
              } else if (this.lastFrameBuffer) {
                return this.lastFrameBuffer;
              } else {
                // Wait for next explicit tick or fallback if damage driven logic fails
                // When beginFrame is active, Page.captureScreenshot hangs.
                // But if we're here, it means the frame was omitted. Let's just create an empty buffer
                // to avoid hanging
                this.lastFrameBuffer = this.emptyImageBuffer;
                return this.emptyImageBuffer;
              }
            });
```

### Step 2: Optimize default capture parameters
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the default `if (this.cdpSession)` block, remove `({ screenshotData })` destructuring.

```typescript
      return this.cdpSession.send('HeadlessExperimental.beginFrame', params).then((res: any) => {
        if (res && res.screenshotData) {
          const buffer = this.writeToBufferPool(res.screenshotData);
          this.lastFrameBuffer = buffer;
          return buffer;
        } else if (this.lastFrameBuffer) {
          // Chromium detected no visual damage and omitted the screenshot.
          // Reuse the last successfully captured frame for the video stream.
          return this.lastFrameBuffer;
        } else {
          // If no damage was detected but we don't have a previous frame (e.g., frame 0),
          // fallback to a standard CDP capture to guarantee an initial frame buffer.
          this.lastFrameBuffer = EMPTY_IMAGE_BUFFER;
          return EMPTY_IMAGE_BUFFER;
        }
      });
```
