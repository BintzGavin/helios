---
id: PERF-760
slug: skip-base64-decode-for-duplicate-frames
status: complete
claimed_by: "executor-session"
created: 2024-06-14
completed: "2026-06-13"
result: failed
---

# PERF-760: Skip Base64 Decode for Duplicate Frames

## Focus Area
`CaptureLoop.ts` fast path and multi-worker path. The focus is on the `Buffer.from(buffer, 'base64')` step.

## Background Research
Currently in `CaptureLoop.ts`, if the returned buffer is a string, it unconditionally decodes it using `Buffer.from(buffer, 'base64')`.
```typescript
if (typeof buffer === 'string') {
    buffer = Buffer.from(buffer, 'base64');
}
```
If the renderer encounters duplicate frames (where `buffer` is the exact same base64 string as the previous frame), it wastes time re-allocating and re-decoding the base64 string into a new `Buffer`.
PERF-756 tried a similar caching approach but was discarded because the overhead was too high and it didn't use an optimal cache structure. We can improve this by using a simple referential check against the previous frame's base64 string and decoded buffer, avoiding object allocation.
Since `DomStrategy.processCaptureResult` caches the previous result if `screenshotData` is missing, it will return the exact same base64 string reference for duplicate frames. We can use `===` for a fast referential equality check.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark
- **Render Settings**: 600x600, 30fps, 5s (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.41s
- **Bottleneck analysis**: Unconditional `Buffer.from(buffer, 'base64')` allocation and decoding on every frame, even for duplicates.

## Implementation Spec

### Step 1: Add state variables to track the last buffer
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In both the single worker fast path and the multi-worker `runWorker` function, add variables to track the last base64 string and its decoded buffer:
```typescript
let lastBase64Str = '';
let lastDecodedBuf: Buffer | null = null;
```

### Step 2: Skip decode if base64 string matches the last one
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Replace the unconditional decode:
```typescript
if (typeof buffer === 'string') {
    buffer = Buffer.from(buffer, 'base64');
}
```
With a check against the last decoded string:
```typescript
if (typeof buffer === 'string') {
    if (buffer === lastBase64Str) {
        buffer = lastDecodedBuf;
    } else {
        lastBase64Str = buffer;
        buffer = Buffer.from(buffer, 'base64');
        lastDecodedBuf = buffer;
    }
}
```

**Why**: Bypasses the V8 base64 decoding and Buffer allocation entirely if the frame is identical to the previous one, reducing GC pressure and decode time for static parts of an animation.

## Variations
None.

## Canvas Smoke Test
Run canvas benchmark or `npm run build -w packages/renderer`.

## Correctness Check
Run the DOM render benchmark script (`cd packages/renderer && npx tsx scripts/benchmark-perf.ts`) to ensure it produces valid outputs without regressions.


## Results Summary
- **Best render time**: 2.527s (vs baseline 2.523s)
- **Improvement**: -0.15% (slower)
- **Kept experiments**: []
- **Discarded experiments**: [PERF-760]
