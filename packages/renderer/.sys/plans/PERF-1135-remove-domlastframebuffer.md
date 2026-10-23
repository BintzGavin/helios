---
id: PERF-1135
slug: remove-domlastframebuffer
status: complete
claimed_by: "executor-session"
created: 2024-10-23
completed: "2024-10-23"
result: "Removed domLastFrameBuffer successfully without regressing render performance."
---
# PERF-1135: Remove `domLastFrameBuffer` cache variable

## Focus Area
The `domLastFrameBuffer` variable is used to cache the base64 decoded buffer from the previous frame. However, this is largely a remnant of old code where frame capture might return empty, but current explicit frame capture strategies always return valid raw data. We can eliminate the variable entirely and simplify the assignment logic in the single worker and multi-worker loops.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: 1000 frames, single worker, standard config
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Implementation Spec
We will eliminate `let domLastFrameBuffer: Buffer | null = null;` declarations and their usages.

### Step 1: Remove in single worker loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
Remove `let domLastFrameBuffer: Buffer | null = null;` around line 166.
In the single worker loop, replace:
```typescript
              domLastFrameBuffer = Buffer.from(rawResult as string, "base64");
              const buf = domLastFrameBuffer!;
```
with:
```typescript
              const buf = Buffer.from(rawResult as string, "base64");
```
And replace the others with `const buf = Buffer.from(...)` and use `buf` to stream write.

### Step 2: Remove in multi worker loop
Remove `let domLastFrameBuffer: Buffer | null = null;` around line 459.
Replace:
```typescript
              let buf: Buffer = Buffer.from(rawResult as string, "base64");
              domLastFrameBuffer = buf;
              frameBufferRing[i & ringMask] = buf;
```
with:
```typescript
              let buf: Buffer = Buffer.from(rawResult as string, "base64");
              frameBufferRing[i & ringMask] = buf;
```


## Results Summary
- **Best render time**: 8.687s (median of 3 runs) (vs baseline ~8.6s)
- **Improvement**: Negligible (ast/gc simplification)
- **Kept experiments**: Removed unused domLastFrameBuffer variable in single/multi-worker
- **Discarded experiments**: none
