---
id: PERF-195
slug: stream-base64
status: unclaimed
claimed_by: ""
created: 2024-06-01
completed: ""
result: ""
---
# PERF-195: Stream Base64 to FFmpeg

## Focus Area
DOM Rendering Pipeline (`packages/renderer/src/strategies/DomStrategy.ts` and `packages/renderer/src/Renderer.ts`)

## Background Research
Currently, `DomStrategy` decodes the base64 string from CDP `HeadlessExperimental.beginFrame` into a `Buffer` using `Buffer.from(res.screenshotData, 'base64')` for every frame. The `Renderer` then writes this buffer to FFmpeg's `stdin`. However, Node.js `stream.Writable.write` supports writing a string with a specified encoding (`writable.write(str, 'base64')`). By skipping the explicit `Buffer` allocation in JS and passing the base64 string directly to FFmpeg's stream, Node decodes the string internally in C++ into the stream's internal buffers. This eliminates allocating ~150 large Buffers per worker, reducing GC pressure and micro-stalls.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 33.5s
- **Bottleneck analysis**: Continuous allocation of ~100KB buffers per frame causes unnecessary garbage collection overhead in V8.

## Implementation Spec

### Step 1: Update RenderStrategy Interface
**File**: `packages/renderer/src/strategies/RenderStrategy.ts`
**What to change**: Update the return type of `capture` to `Promise<Buffer | string>` and `finish` to `Promise<Buffer | string | void>`.
**Why**: Allows the strategy to return raw base64 strings instead of pre-decoded Buffers.
**Risk**: Strategies not updated might cause type errors, but we will update `DomStrategy` and `CanvasStrategy` can still return `Buffer`.

### Step 2: Update DomStrategy to Return Base64
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
- Remove `Buffer.from(res.screenshotData, 'base64')` and simply return `res.screenshotData`.
- Update `this.lastFrameBuffer` property to `this.lastFrameData: Buffer | string | null` and cache the string instead.
- Update `this.emptyImageBuffer` assignments to also store an `emptyImageBase64` string property for fallback.
**Why**: Avoids dynamic allocation of `Buffer` for every frame in the hot loop.
**Risk**: Empty frame handling needs to return a base64 string correctly.

### Step 3: Stream String to FFmpeg in Renderer
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
- Update `captureWorkerFrame` return type and `framePromises` to expect `Promise<Buffer | string>`.
- In the write loop, check if the data is a string. If so, write using `ffmpegProcess.stdin.write(buffer, 'base64', onWriteError)`. Otherwise, use `ffmpegProcess.stdin.write(buffer, onWriteError)`. Do the same for `finish()`.
**Why**: Takes advantage of Node.js stream internals to decode base64 without intermediate JS buffers.
**Risk**: Stream backpressure might handle strings slightly differently, but it is supported in Node.js.

## Canvas Smoke Test
Run `npx tsx tests/verify-canvas-strategy.ts` to ensure Canvas mode still writes buffers correctly.

## Correctness Check
Run `npx tsx tests/verify-cdp-driver.ts` to ensure DOM mode output is correctly written and decoded by FFmpeg.

## Prior Art
PERF-186 optimized allocation during base64 processing, but didn't eliminate the buffer allocation entirely.
