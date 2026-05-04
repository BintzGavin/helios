---
id: PERF-432
slug: PERF-432-avoid-dom-strategy-begin-frame-await
status: unclaimed
claimed_by: ""
created: 2026-10-18
completed: ""
result: ""
---

# PERF-432: Eliminate Await in DomStrategy BeginFrame Capture

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts` - the hot loop `capture` method.

## Background Research
Currently, inside the `capture` method of `DomStrategy.ts`, the CDP command `HeadlessExperimental.beginFrame` is awaited to receive the `screenshotData` from Chromium:

```typescript
    try {
      result = await this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams);
    } catch (e) {
      result = {};
    }

    const frameData = result.screenshotData || this.lastFrameData!;
    this.lastFrameData = frameData;
    return frameData;
```

Awaiting `this.cdpSession!.send(...)` involves an IPC round-trip and forces the V8 execution context in Node.js to yield and resume. In previous experiments (like PERF-375 in `CdpTimeDriver.ts`), removing `await` from fire-and-forget media sync commands yielded measurable improvements by pipelining commands and reducing Node.js event loop scheduling overhead.

However, for `beginFrame`, we *need* the result (the base64 screenshot string) to feed into the FFmpeg buffer ring. We cannot simply return void. But, since the method signature of `capture` returns a `Promise<Buffer | string>`, we can directly return the Promise chain instead of using an `await` block, which slightly optimizes V8's asynchronous execution state machine by eliminating an intermediate async suspension point.

By rewriting the logic to return the Promise directly and process the result using `.then()`, we avoid the `async` state machine overhead within the `capture` function's execution context.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10 duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~42.274s
- **Bottleneck analysis**: The `async/await` wrapper around the CDP IPC round-trip for every single frame adds minor GC and event loop scheduling overhead.

## Implementation Spec

### Step 1: Remove `await` from capture method for non-target element path
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
We will still need `async` for the `this.targetElementHandle.screenshot()` path because we want to keep the implementation simple. But we can optimize the `HeadlessExperimental.beginFrame` path.

```typescript
  async capture(page: Page, frameTime: number): Promise<Buffer | string> {
    if (this.targetElementHandle) {
      const res = await this.targetElementHandle.screenshot(this.elementScreenshotParams);
      if (res) {
        this.lastFrameData = res;
        return res;
      }
      return this.lastFrameData!;
    }

    this.beginFrameParams.frameTimeTicks = 10000 + frameTime;

    return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams)
      .then((result: any) => {
        const frameData = result.screenshotData || this.lastFrameData!;
        this.lastFrameData = frameData;
        return frameData;
      })
      .catch(() => {
        return this.lastFrameData!;
      });
  }
```

**Why**: Returning the promise chain directly skips the implicit `Promise` creation and resolution sequence that `async/await` introduces internally when awaiting a promise and returning its resolved value. It passes the resolution responsibility directly to the caller (`CaptureLoop.ts`), which natively awaits the returned promise.

### Step 2: Prebind Handlers
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Define the handlers as bound class methods to avoid per-frame dynamic closure allocations.

```typescript
  private handleBeginFrameSuccess = (result: any) => {
    const frameData = result.screenshotData || this.lastFrameData!;
    this.lastFrameData = frameData;
    return frameData;
  };

  private handleBeginFrameError = () => {
    return this.lastFrameData!;
  };

  async capture(page: Page, frameTime: number): Promise<Buffer | string> {
    if (this.targetElementHandle) {
      // ... existing code ...
    }

    this.beginFrameParams.frameTimeTicks = 10000 + frameTime;

    return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams)
      .then(this.handleBeginFrameSuccess, this.handleBeginFrameError);
  }
```

**Why**: Using prebound handlers with `.then(success, error)` avoids dynamic closure allocations while completely removing the `try/catch` and `await` state machine overhead within the `capture` hot loop.

## Variations
If the native `async/await` optimization in V8 is actually faster than manual Promise `.then` chaining (as seen in some recent V8 versions), this experiment might show no improvement or a slight regression. The Executor should measure carefully.

## Canvas Smoke Test
Run `npm run build:examples && npm run build -w packages/renderer && cd packages/renderer && npx tsx scripts/benchmark-test.js --mode canvas` to ensure Canvas strategy still works (should not be affected since CanvasStrategy is a separate file).

## Correctness Check
Run the DOM render benchmark script (`npm run build:examples && npm run build -w packages/renderer && cd packages/renderer && npx tsx scripts/benchmark-test.js`) multiple times to verify median render time improvement and ensure the generated `output.mp4` contains 600 correct frames.

## Prior Art
- PERF-395 removed a `.catch(() => ({}))` chain in this exact location in favor of `try/catch` to avoid closure allocations, yielding a ~0.2s improvement. This plan takes it a step further by removing the `await` entirely while maintaining prebound handler allocation efficiency.
