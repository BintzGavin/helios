---
id: PERF-756
slug: cache-decoded-buffer
status: complete
claimed_by: "executor-session"
created: 2024-06-13
completed: "2026-06-13"
result: "discarded"
---

# PERF-756: Cache Decoded Buffer in CaptureLoop for Unchanged Frames

## Focus Area
Frame Capture Loop (`CaptureLoop.ts`).

## Background Research
Currently, when using CDP to capture frames, `CaptureLoop` processes the frame data. If the frame hasn't changed (e.g., when the UI is idle between animations or no visual damage), `DomStrategy.processCaptureResult` might return the same base64 string as the previous frame.
In `CaptureLoop.ts` (single worker fast path and multi-worker path), if the buffer is a string, it calls `Buffer.from(buffer, 'base64')` on *every single frame*. For identical string values across consecutive frames, we are redundantly allocating a new Buffer and doing base64 decoding on the V8 string heap.
We can cache the decoded buffer alongside the string. If the returned string is identical to the last frame's string, we reuse the decoded `Buffer` from the previous frame.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark composition (`examples/dom-benchmark`)
- **Render Settings**: 600x600, 30fps, 5s duration, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.34s - 2.48s
- **Bottleneck analysis**: Unnecessary base64 decoding and Buffer allocation when consecutive frames are identical.

## Implementation Spec

### Step 1: Implement Cache in Single Worker Path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the fast path for a single worker (before the `for (let i = 0; i < totalFrames; i++)` loop at line ~148):
Add variables to track the last string and its decoded buffer before the loop:
```typescript
let lastStringResult: string | null = null;
let lastDecodedBuffer: Buffer | null = null;
```
Inside the loop, replace the `if (typeof buffer === 'string') { buffer = Buffer.from(buffer, 'base64'); }` block at line ~157 with:
```typescript
if (typeof buffer === 'string') {
    if (buffer === lastStringResult) {
        buffer = lastDecodedBuffer!;
    } else {
        lastStringResult = buffer;
        buffer = Buffer.from(buffer, 'base64');
        lastDecodedBuffer = buffer;
    }
}
```
**Why**: Reuses the previously decoded Buffer if the base64 string is identical to the last frame, bypassing V8 string heap allocation and Node.js base64 decode overhead for duplicate frames.
**Risk**: Holding a reference to the `lastDecodedBuffer` might slightly increase GC pressure, but it replaces a continuous stream of new Buffer allocations, so net memory pressure should decrease.

### Step 2: Implement Cache in Multi Worker Path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `runWorker` function inside the `else` block (multi-worker path, around line ~250):
Add the same caching variables:
```typescript
let lastStringResult: string | null = null;
let lastDecodedBuffer: Buffer | null = null;
```
Apply the same check inside the loop at line ~281:
```typescript
if (typeof buffer === 'string') {
    if (buffer === lastStringResult) {
        buffer = lastDecodedBuffer!;
    } else {
        lastStringResult = buffer;
        buffer = Buffer.from(buffer, 'base64');
        lastDecodedBuffer = buffer;
    }
}
```
**Why**: Same reasoning as above, but scoped per worker to avoid concurrent mutation issues.

## Variations
None.

## Canvas Smoke Test
Run `npm run build -w packages/renderer` to ensure no syntax errors.

## Correctness Check
Run the DOM render benchmark `cd packages/renderer && npx tsx scripts/benchmark-perf.ts --concurrency 1` to verify performance and correctness.

## Results Summary
- **Best render time**: 2.673s (vs baseline 2.716s)
- **Improvement**: ~1.5% (Within noise margin)
- **Kept experiments**: None
- **Discarded experiments**: Cache Decoded Buffer in CaptureLoop for Unchanged Frames
