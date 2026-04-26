---
id: PERF-367
slug: eliminate-polymorphic-buffer-checks
status: complete
claimed_by: "executor-session"
created: 2024-04-26
completed: 2024-04-26
result: discard
---

# PERF-367: Eliminate Polymorphic Buffer Checks in CaptureLoop

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - `writeToStdin` function.
`packages/renderer/src/strategies/DomStrategy.ts` - `capture` function return types.

## Background Research
In the current actor model backpressure loop, `DomStrategy` returns a union type `Promise<Buffer | string>` on every frame. When `HeadlessExperimental.beginFrame` succeeds without using the Playwright fallback, it produces a base64 encoded string (`res.screenshotData`), which gets passed all the way to `writeToStdin` in `CaptureLoop.ts`.
In `writeToStdin` (and during `finalBuffer` handling), the renderer inspects `typeof buffer === 'string'`, and subsequently uses the built-in Node.js `stdin.write(buffer, 'base64', onWriteError)`.

```typescript
// In CaptureLoop.ts:
    let canWriteMore: boolean;
    if (typeof buffer === 'string') {
        canWriteMore = this.ffmpegManager.stdin.write(buffer, 'base64', onWriteError);
    } else {
        canWriteMore = this.ffmpegManager.stdin.write(buffer, onWriteError);
    }
```

This dynamic `typeof buffer === 'string'` check executes 600 times per second per worker in the tightest part of the hot loop. V8 has to branch predict this dynamic type check. More importantly, returning multiple possible types from `strategy.capture()` makes the call site polymorphic. By enforcing that `DomStrategy.capture()` strictly and always returns `string` (base64) when in DOM mode, and by having `CaptureLoop.ts` expect monomorphic execution paths, we can reduce branch evaluation overhead.
(Note: `CanvasStrategy` can continue returning `Buffer`, but for any given run, the pipeline will only ever see one type, allowing the JIT to aggressively optimize.)

Currently, `DomStrategy` returns `Buffer` in three cases:
1. `this.emptyImageBuffer` (a pre-decoded `Buffer` used internally, but `DomStrategy` also manages `emptyImageBase64`).
2. Playwright fallback captures (`targetElementHandle.screenshot()`), which returns a `Buffer`.
3. `CanvasStrategy` captures (which are out of scope for this `dom` mode optimization, but `CaptureLoop` must still support it generically).

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080 resolution, 60 FPS, 10 duration, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~48.05s (from PERF-366)
- **Bottleneck analysis**: Polymorphic return types (`Buffer | string`) and dynamic `typeof` branch checking inside the `writeToStdin` hot loop limit V8 JIT monomorphic optimizations.

## Implementation Spec

### Step 1: Enforce strict `string` return type in `DomStrategy.ts`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Ensure `this.lastFrameData` is explicitly typed or always initialized/updated as `string`. Update its type signature to `private lastFrameData: string = "";`.
2. Ensure the `lastFrameData` initialization in `prepare()` strictly uses `this.emptyImageBase64` instead of `this.emptyImageBuffer`. (It already does this: `this.lastFrameData = this.emptyImageBase64;`).
3. For the `targetElementHandle.screenshot()` fallback path in `capture()`, convert the resulting `Buffer` to a base64 string before storing and returning it.
```typescript
<<<<<<< SEARCH
      const res = await this.targetElementHandle.screenshot({
        type: this.cdpScreenshotParams.format,
        quality: this.cdpScreenshotParams.quality,
        omitBackground: !isOpaque
      });
      if (res) {
        this.lastFrameData = res;
        return res;
      }
=======
      const res = await this.targetElementHandle.screenshot({
        type: this.cdpScreenshotParams.format,
        quality: this.cdpScreenshotParams.quality,
        omitBackground: !isOpaque
      });
      if (res) {
        const base64Str = res.toString('base64');
        this.lastFrameData = base64Str;
        return base64Str;
      }
>>>>>>> REPLACE
```
4. The main CDP call already returns `res.screenshotData` (which is a string), so that is fine.
5. In `capture()` signature, keep it as `Promise<Buffer | string>` to satisfy the `RenderStrategy` interface since `CanvasStrategy` returns `Buffer`, but guarantee that `DomStrategy` only returns `string`.

### Step 2: Remove unnecessary dynamic checks where safe
**Why**: Since a strategy during a run will consistently return either `string` (for DOM) or `Buffer` (for Canvas), V8 will quickly optimize the branch in `CaptureLoop.ts`. We don't need to change `CaptureLoop.ts` because it handles both, but ensuring `DomStrategy` doesn't flip between `Buffer` and `string` dynamically during a render run will allow V8 to treat the `CaptureLoop.ts` `writeToStdin` call site as monomorphic for the duration of the run.

**Risk**: Negligible. The conversion of fallback Playwright screenshots to base64 adds a slight overhead but since target fallbacks are rare (and already optimized out for many elements via `PERF-366`), it ensures consistent type behavior for the JIT.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` from the `packages/renderer` directory to ensure Canvas mode still works (it uses `Buffer`).

## Correctness Check
Run `npx tsx tests/verify-dom-strategy-capture.ts` from the `packages/renderer` directory.
Run the DOM render benchmark script multiple times to verify median render time improvement.

## Prior Art
- PERF-360 attempted to decode strings to buffers inside `DomStrategy` and failed. This experiment forces everything to strictly remain as strings in DOM mode, relying on FFmpeg `stdin.write`'s native fast C++ base64 decoder.

## Results Summary
- **Best render time**: 46.328s (vs baseline 46.443s, median: 46.452s vs 46.443s)
- **Improvement**: ~0%
- **Kept experiments**: []
- **Discarded experiments**: [PERF-367]
