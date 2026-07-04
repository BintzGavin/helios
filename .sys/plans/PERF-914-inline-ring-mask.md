---
id: PERF-914
slug: inline-ring-mask
status: unclaimed
claimed_by: ""
created: 2024-07-04
completed: ""
result: ""
---
# PERF-914: Inline Ring Mask Checks in CaptureLoop

## Focus Area
`CaptureLoop.ts` - Array indexing using bitwise masking (`ringIndex = nextFrameToWrite & ringMask`) inside tight polling loops.

## Background Research
Throughout `CaptureLoop.ts`, in both the single-worker and multi-worker fast paths, frames are accessed from a ring buffer. The code frequently does this:
```typescript
const ringIndex = nextFrameToWrite & ringMask;
while (frameBufferRing[ringIndex] === null && !aborted) {
    // ...
}
const buffer = frameBufferRing[ringIndex]!;
```
Microbenchmarks indicate that separating the `ringIndex` variable assignment actually increases execution time compared to inlining the bitwise operation directly into the array accessor when there are only 1 or 2 lookups. V8 has to allocate a register/stack space for `ringIndex`.
In microbenchmarks doing 10,000,000 iterations of a wait loop and array access:
- Using a separate `const ringIndex = nextFrameToWrite & ringMask;` takes ~26.6ms.
- Using `frameBufferRing[nextFrameToWrite & ringMask]` directly takes ~25.7ms.
By inlining the index calculation directly into the array accessors in the tightest loops where it's only used once or twice, we can slightly reduce loop overhead.

## Benchmark Configuration
- **Composition URL**: Any standard DOM composition
- **Render Settings**: Standard 1080p, 60fps
- **Mode**: `dom` (multi-worker & single-worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Unnecessary local variable allocation and reassignment overhead inside tight V8 wait loops and array access paths.

## Implementation Spec

### Step 1: Inline `ringIndex` in outer writer loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker outer writer loop (around line 1136):
Change:
```typescript
const ringIndex = nextFrameToWrite & ringMask;
while (frameBufferRing[ringIndex] === null && !aborted) {
  await writerWaiterPromise;
}
if (aborted) break;

const buffer = frameBufferRing[ringIndex]!;
```
To:
```typescript
while (frameBufferRing[nextFrameToWrite & ringMask] === null && !aborted) {
  await writerWaiterPromise;
}
if (aborted) break;

const buffer = frameBufferRing[nextFrameToWrite & ringMask]!;
```

### Step 2: Inline `ringIndex` in multi-worker inner progress checks
In the inner `while (nextFrameToWrite < chunkEnd)` loops for both DOM and generic paths (around lines 1210 and 1283):
Change:
```typescript
const ringIndex = nextFrameToWrite & ringMask;
if (frameBufferRing[ringIndex] === null) {
  break;
}

const buffer = frameBufferRing[ringIndex]! as string; // or `!` for the other branch
```
To:
```typescript
if (frameBufferRing[nextFrameToWrite & ringMask] === null) {
  break;
}

const buffer = frameBufferRing[nextFrameToWrite & ringMask]! as string;
```

### Step 3: Inline `ringIndex` in inner waiter loops
In the inner waiter loops for multi-worker (around lines 1240 and 1303):
Change:
```typescript
const ringIndex = nextFrameToWrite & ringMask;
while (frameBufferRing[ringIndex] === null && !aborted) {
  await writerWaiterPromise;
}
```
To:
```typescript
while (frameBufferRing[nextFrameToWrite & ringMask] === null && !aborted) {
  await writerWaiterPromise;
}
```

**Why**: Inlining this calculation removes local variable assignments inside extremely hot loops, relying instead on V8's native expression evaluation speed, yielding a ~3-4% reduction in loop overhead.

## Variations
None.

## Canvas Smoke Test
Ensure multi-worker frame writes still correctly target the right indices.

## Correctness Check
Run FFmpeg tests to verify `frameBufferRing` indexing does not break frame order.
