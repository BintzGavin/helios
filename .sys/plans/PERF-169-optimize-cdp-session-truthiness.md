---
id: PERF-169
slug: optimize-cdp-session-truthiness
status: unclaimed
claimed_by: ""
created: 2025-04-04
completed: ""
result: ""
---

# PERF-169: Remove defensive truthiness checks for cdpSession in DomStrategy hot loops

## Focus Area
DOM Rendering Pipeline - Hot Loop (`capture` method in `DomStrategy.ts`). This is the most frequently executed code path during rendering, and eliminating unnecessary branch evaluation overhead here provides compounding returns.

## Background Research
Currently, inside `DomStrategy.ts`'s `capture` method, there are defensive truthiness checks `if (this.cdpSession)` and `if (this.targetElementHandle)` executed on every single frame. Because we always initialize `this.cdpSession` in `prepare` before rendering begins, and we don't clear it until `finish()`, this variable is definitively `!== null` throughout the hot capture loop. The same applies to `targetElementHandle`.
In V8, branch evaluation isn't free. Even highly predictable branches occupy instruction cache space and cause micro-stalls. A previous attempt (PERF-144) to simply remove this branch was documented as "WHY it didn't work: Defensive truthiness checks... must be preserved... to maintain necessary fallback paths (e.g., page.screenshot())".
However, we can bypass the branch entirely in the hot path by resolving the capture strategy *once* in `prepare` and executing that pre-bound pathway in the hot loop, completely avoiding the `if (this.cdpSession)` and `if (this.targetElementHandle)` checks without losing the fallback capabilities.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1920x1080, 60fps, 2 seconds (120 frames), software video codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.057s
- **Bottleneck analysis**: The V8 hot capture loop in `DomStrategy.ts` contains unnecessary conditional branches evaluating `this.cdpSession` and `this.targetElementHandle` on every frame.

## Implementation Spec

### Step 1: Pre-resolve the capture pathway in `DomStrategy.prepare`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Instead of checking `this.cdpSession` and `this.targetElementHandle` in `capture()`, declare an internal property `private _captureStrategy!: (page: Page, frameTime: number) => Promise<Buffer>;`.
In `prepare()`, determine which capture path is active and assign `this._captureStrategy`:

```typescript
    if (this.targetElementHandle) {
      if (this.cdpSession) {
        this._captureStrategy = (page: Page, frameTime: number) => {
          return this.targetElementHandle.boundingBox().then((box: any) => {
            if (box) {
              this.beginFrameTargetParams.screenshot.clip.x = box.x;
              this.beginFrameTargetParams.screenshot.clip.y = box.y;
              this.beginFrameTargetParams.screenshot.clip.width = box.width;
              this.beginFrameTargetParams.screenshot.clip.height = box.height;
              this.beginFrameTargetParams.frameTimeTicks = 10000 + frameTime;
              return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameTargetParams).then(({ screenshotData }: any) => {
                if (screenshotData) {
                  const buffer = this.writeToBufferPool(screenshotData);
                  this.lastFrameBuffer = buffer;
                  return buffer;
                } else if (this.lastFrameBuffer) {
                  return this.lastFrameBuffer;
                } else {
                  this.lastFrameBuffer = this.emptyImageBuffer;
                  return this.emptyImageBuffer;
                }
              });
            }
            return this.targetElementHandle.screenshot((this as any).fallbackScreenshotOptions).then((fallback: any) => {
              this.lastFrameBuffer = fallback;
              return fallback as Buffer;
            });
          });
        };
      } else {
        this._captureStrategy = (page: Page, frameTime: number) => {
           return this.targetElementHandle.screenshot((this as any).fallbackScreenshotOptions).then((fallback: any) => {
             this.lastFrameBuffer = fallback;
             return fallback as Buffer;
           });
        };
      }
    } else {
      if (this.cdpSession) {
        this._captureStrategy = (page: Page, frameTime: number) => {
          this.beginFrameParams.frameTimeTicks = 10000 + frameTime;
          return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams).then(({ screenshotData }: any) => {
            if (screenshotData) {
              const buffer = this.writeToBufferPool(screenshotData);
              this.lastFrameBuffer = buffer;
              return buffer;
            } else if (this.lastFrameBuffer) {
              return this.lastFrameBuffer;
            } else {
              this.lastFrameBuffer = EMPTY_IMAGE_BUFFER; // Note: using EMPTY_IMAGE_BUFFER here instead of this.emptyImageBuffer because of the previous code
              return EMPTY_IMAGE_BUFFER;
            }
          });
        };
      } else {
        this._captureStrategy = (page: Page, frameTime: number) => {
          return page.screenshot((this as any).fallbackScreenshotOptions).then((fallback: any) => {
            this.lastFrameBuffer = fallback;
            return fallback as Buffer;
          });
        };
      }
    }
```
**Why**: This statically binds the decision *once* during preparation instead of dynamically evaluating the `cdpSession` and `targetElementHandle` branches dynamically on all 120+ frames.

### Step 2: Simplify `capture` method
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Replace the entire implementation of the `capture()` method with a direct delegation:
```typescript
  capture(page: Page, frameTime: number): Promise<Buffer> {
    return this._captureStrategy(page, frameTime);
  }
```

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to verify DOM frame generation still functions properly across configurations.
Run `npm run test -w packages/renderer` to ensure baseline functionality remains green.
