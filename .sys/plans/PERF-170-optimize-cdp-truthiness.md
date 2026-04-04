---
id: PERF-170
slug: optimize-cdp-truthiness
status: unclaimed
claimed_by: ""
created: 2025-04-05
completed: ""
result: ""
---

# PERF-170: Remove Defensive Truthiness Checks in DOM Strategy Capture Loop

## Focus Area
The hot loop in `DomStrategy.capture()` where Chromium's `HeadlessExperimental.beginFrame` is invoked.

## Background Research
In `DomStrategy.capture()`, defensive truthiness checks like `if (this.cdpSession)` are evaluated on every single frame. However, the `cdpSession` is initialized in `prepare()` and guaranteed to exist (unless explicitly torn down). Previously, we tried to optimize this (PERF-144) but abandoned it. However, the previous experiment may have been flawed or incomplete. By using the non-null assertion operator `!` (e.g., `this.cdpSession!.send(...)`), we can avoid the conditional branching overhead in the V8 JIT compiler without actually pre-resolving strategies (which failed in PERF-169 due to closure allocation).

This experiment aims to explicitly verify if V8 conditional branch evaluations for `this.cdpSession` inside `capture()` are a source of micro-stalls.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.7s
- **Bottleneck analysis**: Micro-stalls in the hot loop from unnecessary conditional evaluations.

## Implementation Spec

### Step 1: Remove `this.cdpSession` check in `capture()`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Inside `DomStrategy.capture(page: Page, frameTime: number)`, remove the `if (this.cdpSession)` wrappers and rely on the non-null assertion `this.cdpSession!.send()`.

```typescript
<<<<<<< SEARCH
  capture(page: Page, frameTime: number): Promise<Buffer> {
    if (this.targetElementHandle) {
      if (this.cdpSession) {
        return this.targetElementHandle.boundingBox().then((box: any) => {
=======
  capture(page: Page, frameTime: number): Promise<Buffer> {
    if (this.targetElementHandle) {
      return this.targetElementHandle.boundingBox().then((box: any) => {
>>>>>>> REPLACE
<<<<<<< SEARCH
          return this.targetElementHandle.screenshot((this as any).fallbackScreenshotOptions).then((fallback: any) => {
            this.lastFrameBuffer = fallback;
            return fallback as Buffer;
          });
        });
      }

      return this.targetElementHandle.screenshot((this as any).fallbackScreenshotOptions).then((fallback: any) => {
        this.lastFrameBuffer = fallback;
        return fallback as Buffer;
      });
    }

    if (this.cdpSession) {
      this.beginFrameParams.frameTimeTicks = 10000 + frameTime;

      return this.cdpSession.send('HeadlessExperimental.beginFrame', this.beginFrameParams).then(({ screenshotData }: any) => {
=======
          return this.targetElementHandle.screenshot((this as any).fallbackScreenshotOptions).then((fallback: any) => {
            this.lastFrameBuffer = fallback;
            return fallback as Buffer;
          });
        });
    }

    this.beginFrameParams.frameTimeTicks = 10000 + frameTime;

    return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams).then(({ screenshotData }: any) => {
>>>>>>> REPLACE
<<<<<<< SEARCH
        } else {
          // If no damage was detected but we don't have a previous frame (e.g., frame 0),
          // fallback to a standard CDP capture to guarantee an initial frame buffer.
          this.lastFrameBuffer = EMPTY_IMAGE_BUFFER;
          return EMPTY_IMAGE_BUFFER;
        }
      });
    } else {
      return page.screenshot((this as any).fallbackScreenshotOptions).then((fallback: any) => {
        this.lastFrameBuffer = fallback;
        return fallback as Buffer;
      });
    }
  }
=======
        } else {
          // If no damage was detected but we don't have a previous frame (e.g., frame 0),
          // fallback to a standard CDP capture to guarantee an initial frame buffer.
          this.lastFrameBuffer = EMPTY_IMAGE_BUFFER;
          return EMPTY_IMAGE_BUFFER;
        }
      });
  }
>>>>>>> REPLACE
```

**Why**: Eliminates a branch evaluation per frame for `cdpSession`.
**Risk**: If `cdpSession` is genuinely null (e.g., initialization failed or fallback is explicitly needed), it will throw a TypeError.

## Correctness Check
Verify `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` successfully renders without throwing TypeErrors about `cdpSession`.
