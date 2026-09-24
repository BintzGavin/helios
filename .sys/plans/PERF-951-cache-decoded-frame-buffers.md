---
id: PERF-951
slug: cache-decoded-frame-buffers
status: complete
claimed_by: "jules"
created: 2024-07-09
completed: "2024-07-10"
result: "Skipped - Duplicate of PERF-966"
---

# PERF-951: Decode Base64 to Buffers Earlier in Multi-Worker Loop

## Focus Area
The multi-worker loop where `frameBufferRing` is populated in `CaptureLoop.ts`. Specifically, converting strings to `Buffer` objects inside the worker response handler (`isDomStrategy`) before adding them to `frameBufferRing`, rather than doing the conversion inside the main writer loop.

## Background Research
In the multi-worker path (`isDomStrategy` true), each worker pulls frame data (Base64 strings) via CDP and pushes those strings to `frameBufferRing`. The main writer loop polls `frameBufferRing`, extracts the string, and dynamically converts it to a Node.js `Buffer` in the fast loop (`Buffer.from(buffer, "base64")`) right before piping to `stream.write()`.

Node.js `Buffer.from(str, "base64")` is synchronous and highly CPU-bound. By performing the Base64-to-Buffer decoding synchronously inside the writer chunk loop, we introduce unnecessary pipeline jitter by doing heavy CPU work back-to-back right when we're trying to quickly flush data to `ffmpeg`. If the Base64 decode is shifted to the moment the worker successfully retrieves the frame (`rawResult.screenshotData` handler), the work can be offloaded onto the individual worker's execution turn, keeping the writer fast loop free of decode allocations.

Since `frameBufferRing` already holds arbitrary string or buffer data for canvas rendering, there's no reason we can't cache the pre-decoded `Buffer` instead of the base64 string.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard
- **Mode**: `dom` (multi-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The writer loop in `CaptureLoop.ts` does `Buffer.from(buffer, "base64")` back-to-back, adding decode latency before each chunk flush.

## Implementation Spec

### Step 1: Decode Base64 immediately in the worker response loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker handler paths under `if (isDomStrategy)` where workers retrieve the screenshot data (around lines 879 and 919 inside the `runWorker` block):
When parsing and pushing to `frameBufferRing`:
```typescript
                const data = rawResult.screenshotData;
                if (data) {
                  domLastFrameData = data;
                }
                buffer = domLastFrameData;
                frameBufferRing[ringIndex] = buffer;
```
Change it to decode immediately:
```typescript
                const data = rawResult.screenshotData;
                if (data) {
                  domLastFrameData = data;
                }
                buffer = Buffer.from(domLastFrameData as string, "base64");
                frameBufferRing[ringIndex] = buffer;
```

### Step 2: Remove Base64 decode from the multi-worker writer path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker writer fast loop (around line 1120), the `isDomStrategyWriter` branch currently reads:
```typescript
                const buffer = frameBufferRing[ringIndex]! as string;

                pendingBytes += (buffer.length * 3) >>> 2;
                const writeSuccess = stream.write(Buffer.from(buffer, "base64"));
```
Since the `buffer` is now actually a pre-allocated Node `Buffer`, rewrite the writer to simply:
```typescript
                const buffer = frameBufferRing[ringIndex]! as Buffer;

                pendingBytes += buffer.length;
                const writeSuccess = stream.write(buffer);
```

**Why**: Offloads synchronous C++ Base64 decode latency from the hot sequential writer loop onto the individual worker turns, reducing writer pipeline jitter.

## Variations
None.

## Correctness Check
Run tests to verify memory limits aren't exceeded by caching decoded buffers and that stream output is correctly piped.
