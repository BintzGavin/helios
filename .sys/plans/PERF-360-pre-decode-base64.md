---
id: PERF-360
slug: pre-decode-base64
status: complete
claimed_by: "executor-session"
created: 2024-05-30
completed: "2024-06-05"
result: "discarded"
---

# PERF-360: Pre-decode CDP Base64 Frames to Buffers

## Focus Area
`DomStrategy.ts` frame capture cache (`this.lastFrameData`). This targets the CPU and GC overhead of decoding base64 image strings during the hot capture loop.

## Background Research
When using `HeadlessExperimental.beginFrame`, Chromium optimizes IPC by omitting `screenshotData` if the visual state of the page hasn't changed since the last frame (e.g., during static periods or if the animation FPS is lower than the render FPS). In these cases, `DomStrategy` falls back to its cached `this.lastFrameData`.

Currently, `this.lastFrameData` caches the raw base64 string returned by CDP. When `CaptureLoop.ts` receives this string, it calls `ffmpegManager.stdin.write(buffer, 'base64')`. Under the hood, Node.js must decode this string into a `Buffer` before passing it to the OS stream.

This means for every *duplicate* frame, Node.js spends CPU cycles re-decoding the exact same base64 string into a new Buffer. Base64 decoding a 1080p PNG string is non-trivial. Furthermore, keeping large base64 strings in `this.lastFrameData` increases V8 heap GC pressure, whereas `Buffer` objects manage their memory outside the V8 heap.

By decoding the base64 string to a `Buffer` exactly *once* upon receiving it from CDP and caching the `Buffer` instead, we eliminate the decoding overhead entirely for duplicate frames and reduce V8 GC churn.

## Benchmark Configuration
- **Composition URL**: `$REPO_ROOT/examples/dom-benchmark/composition.html`
- **Render Settings**: 1920x1080, 60 FPS, dom mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~46.298s
- **Bottleneck analysis**: CPU overhead in Node.js event loop due to repeated base64 decoding of duplicate frames and V8 garbage collection of large strings.

## Implementation Spec

### Step 1: Initialize Cache as Buffer
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `prepare` method, change the initialization of `this.lastFrameData`:
```typescript
<<<<<<< SEARCH
    this.lastFrameData = this.emptyImageBase64;
=======
    this.lastFrameData = this.emptyImageBuffer;
>>>>>>> REPLACE
```
**Why**: Ensures the cache starts as a Buffer, matching the new type we will store.
**Risk**: Minimal. `CaptureLoop` already handles both `Buffer` and `string`.

### Step 2: Pre-decode CDP Screenshots in Capture
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `capture` method, update both occurrences where `HeadlessExperimental.beginFrame` returns `screenshotData`. Convert the base64 string to a `Buffer` before caching and returning it.

First occurrence (inside `if (this.targetElementHandle)` -> `if (this.targetClipParams)`):
```typescript
<<<<<<< SEARCH
        if (res && res.screenshotData) {
          this.lastFrameData = res.screenshotData;
          return res.screenshotData;
        }
        return this.lastFrameData!;
=======
        if (res && res.screenshotData) {
          const buf = Buffer.from(res.screenshotData, 'base64');
          this.lastFrameData = buf;
          return buf;
        }
        return this.lastFrameData!;
>>>>>>> REPLACE
```

Second occurrence (at the end of the method):
```typescript
<<<<<<< SEARCH
    if (res && res.screenshotData) {
      this.lastFrameData = res.screenshotData;
      return res.screenshotData;
    }
    return this.lastFrameData!;
=======
    if (res && res.screenshotData) {
      const buf = Buffer.from(res.screenshotData, 'base64');
      this.lastFrameData = buf;
      return buf;
    }
    return this.lastFrameData!;
>>>>>>> REPLACE
```
**Why**: Decodes the base64 string immediately. For unique frames, the overhead is identical to doing it in `stdin.write`. For duplicate frames, this skips the decode step entirely.
**Risk**: High memory usage if Buffers aren't garbage collected, but since we overwrite `this.lastFrameData` on each new frame, the previous Buffer will be dereferenced and collected normally.

## Canvas Smoke Test
Run `npm run test -- tests/verify-canvas-strategy.ts` to ensure Canvas mode is unaffected.

## Correctness Check
Run `npm run test -- tests/verify-dom-strategy-capture.ts` to ensure DOM output continues to correctly encode PNGs and fallback to cached frames without crashing.

## Results Summary
- **Best render time**: 48.372s (vs baseline 49.616s)
- **Improvement**: Inconclusive
- **Kept experiments**: []
- **Discarded experiments**: [Pre-decode CDP Base64 Frames to Buffers]
