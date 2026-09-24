---
id: PERF-897
slug: optimize-pool-pop
status: unclaimed
claimed_by: ""
created: 2024-07-02
completed: ""
result: ""
---

# PERF-897: Optimize Base64 string decode array pooling

## Focus Area
Base64 string decoding buffer pooling `multiFreePool` and `freePool` in `CaptureLoop.ts`.

## Background Research
Currently, when buffering `dom` frame outputs to convert from Base64 into Buffers, `CaptureLoop` uses pooled buffers like `multiFreePool` and `freePool`. To grab a buffer, it relies on array `.pop()` and `.push()` methods.
Array `.pop()` and `.push()` in V8 incur dynamic property resolution and size check overhead compared to direct array index manipulation via a `head` integer pointer. Microbenchmarks running 100M iterations demonstrate a ~40% performance improvement (from ~965ms to ~578ms) by avoiding `pop()` and `push()` in favor of direct index pointers. For CPU-bound base64 decoding, saving array operations yields better throughput.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark
- **Render Settings**: 1080p, 60fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Array dynamic length checks in hot loop Base64 decoding buffer allocations.

## Implementation Spec

### Step 1: Replace array methods with a manual pointer
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Find the definition of `multiFreePool` and `freePool`. Add `multiFreePoolHead` and `freePoolHead` respectively. Initialize them to `multiFreePool.length` and `freePool.length`.
2. Find `PooledBuffer` instantiation and its `freeCb` closure. It pushes to the pool: `pool.push(this)`. Replace this with `pool[poolHead++] = this`. (Assuming pool is an argument).
3. Find all instances of `let pooled = multiFreePool.pop();` and replace it with:
```typescript
let pooled;
if (multiFreePoolHead > 0) {
    pooled = multiFreePool[--multiFreePoolHead];
}
```
And similarly for `freePool`.
**Why**: Avoids dynamic array modifications in V8 which are slower than direct array slot updates.

## Variations
None.

## Canvas Smoke Test
Run canvas benchmark.

## Correctness Check
Run FFmpeg verify tests to ensure streams are fully intact and pooled buffers are recycled properly.
