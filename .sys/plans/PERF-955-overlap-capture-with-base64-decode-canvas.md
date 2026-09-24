---
id: PERF-955
slug: overlap-capture-with-base64-decode-canvas
status: unclaimed
claimed_by: ""
created: 2024-07-09
completed: ""
result: ""
---

# PERF-955: Overlap Capture with Base64 Decode in Single-Worker Canvas Paths

## Focus Area
The single-worker `!isDomStrategy` chunk loops in `CaptureLoop.ts`. Specifically, optimizing the order of operations so that the browser can render/capture the next frame concurrently while Node.js performs CPU-bound Base64 decoding or stream writing.

## Background Research
In the single-worker `!isDomStrategy` loops (e.g. `hasProcessFn = true` and `hasProcessFn = false`), we currently evaluate in this serial order:
1. `rawResult = await nextCapturePromise;`
2. `timePromise = timeDriver.setTime(...)`
3. Base64 decode (or `processCaptureResult`)
4. `await timePromise`
5. `nextCapturePromise = strategy.capture(...)`
6. `stream.write(...)`

This misses a huge opportunity for concurrency. While Node.js synchronously decodes base64 (which takes CPU time) or does stream writes for the current frame, the browser is sitting idle. By hoisting `nextCapturePromise = strategy.capture(...)` to execute *before* `Buffer.from(..., "base64")` and `stream.write(...)`, the browser (and CDP/IPC) starts working concurrently with Node.js CPU-bound operations.

## Benchmark Configuration
- **Composition URL**: Standard canvas benchmark
- **Render Settings**: Standard
- **Mode**: `canvas` (single-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The single-worker canvas loops execute serially. Node.js decodes base64 while the Playwright browser is idle waiting for the next `strategy.capture()` call.

## Implementation Spec

### Step 1: Hoist Capture in `hasProcessFn = true` and `isString` loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker `hasProcessFn = true` chunk loop for `!isDomStrategy` (around line 345):
From:
```typescript
                    const buf = Buffer.from(strategy.processCaptureResult!(rawResult) as string, "base64");

                    if (timePromise) await timePromise;
                    nextCapturePromise = strategy.capture(
                      page,
                      (i + 1) * timeStep,
                    );

                    pendingBytes += buf.length;
                    const writeSuccessStr = stream.write(buf);
```
To:
```typescript
                    if (timePromise) await timePromise;
                    nextCapturePromise = strategy.capture(
                      page,
                      (i + 1) * timeStep,
                    );

                    const buf = Buffer.from(strategy.processCaptureResult!(rawResult) as string, "base64");
                    pendingBytes += buf.length;
                    const writeSuccessStr = stream.write(buf);
```

### Step 2: Hoist Capture in `hasProcessFn = false` and `isString` loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker `hasProcessFn = false` chunk loop for `!isDomStrategy` (around line 605):
From:
```typescript
                    const buf = Buffer.from(rawResult as unknown as string, "base64");

                    if (timePromise) await timePromise;

                    nextCapturePromise = strategy.capture(
                      page,
                      (i + 1) * timeStep,
                    );

                    pendingBytes += buf.length;
                    const writeSuccessStr = stream.write(buf);
```
To:
```typescript
                    if (timePromise) await timePromise;
                    nextCapturePromise = strategy.capture(
                      page,
                      (i + 1) * timeStep,
                    );

                    const buf = Buffer.from(rawResult as unknown as string, "base64");
                    pendingBytes += buf.length;
                    const writeSuccessStr = stream.write(buf);
```

### Step 3: Hoist Capture in `hasProcessFn = true` fallback buffer loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `hasProcessFn = true` chunk loop for canvas buffers (around line 422):
From:
```typescript
                    let buf;
                    buf = strategy.processCaptureResult!(rawResult);
                    pendingBytes += (buf as any).length;

                    if (timePromise) await timePromise;
                    nextCapturePromise = strategy.capture(
                      page,
                      (i + 1) * timeStep,
                    );

                    const writeSuccessBuf = stream.write(buf as any);
```
To:
```typescript
                    if (timePromise) await timePromise;
                    nextCapturePromise = strategy.capture(
                      page,
                      (i + 1) * timeStep,
                    );

                    const buf = strategy.processCaptureResult!(rawResult);
                    pendingBytes += (buf as any).length;
                    const writeSuccessBuf = stream.write(buf as any);
```

### Step 4: Hoist Capture in `hasProcessFn = false` fallback buffer loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `hasProcessFn = false` chunk loop for canvas buffers (around line 680):
From:
```typescript
                    let buf;
                    buf = rawResult;
                    pendingBytes += (buf as any).length;

                    if (timePromise) await timePromise;

                    nextCapturePromise = strategy.capture(
                      page,
                      (i + 1) * timeStep,
                    );

                    const writeSuccessBuf = stream.write(buf as any);
```
To:
```typescript
                    if (timePromise) await timePromise;
                    nextCapturePromise = strategy.capture(
                      page,
                      (i + 1) * timeStep,
                    );

                    const buf = rawResult;
                    pendingBytes += (buf as any).length;
                    const writeSuccessBuf = stream.write(buf as any);
```

**Why**: By firing off the next capture immediately after awaiting `timePromise`, the browser gets busy with CDP messages and capturing pixels while the Node.js main thread synchronously evaluates Buffer manipulation and stream writing.

## Variations
None.

## Correctness Check
Run tests to confirm non-DOM single-worker paths work correctly without output regression.
