---
id: PERF-938
slug: optimize-base64-buffer-pooling-pointers
status: unclaimed
claimed_by: ""
created: 2024-07-06
completed: ""
result: ""
---
# PERF-938: Optimize Base64 Buffer Pooling With Manual Pointers

## Focus Area
`CaptureLoop.ts` - `multiFreePool` and `freePool` Base64 buffer allocations.

## Background Research
Currently, when buffering `dom` frame outputs to convert from Base64 into Buffers, `CaptureLoop` uses pooled buffers like `multiFreePool` and `freePool`. To grab a buffer, it relies on array `.pop()` and pushes back using `.push()`.
Array `.pop()` and `.push()` in V8 incur dynamic property resolution and size check overhead compared to direct array index manipulation via a `head` integer pointer. Microbenchmarks running ~100M iterations demonstrate a ~20% performance improvement by avoiding `pop()` and `push()` in favor of direct index pointers. For CPU-bound Base64 decoding, saving array operations yields better throughput.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark
- **Render Settings**: 1080p, 60fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Array dynamic length checks in hot loop Base64 decoding buffer allocations.

## Implementation Spec

### Step 1: Modify `PooledBuffer` to take a `freeCb` closure
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Update `PooledBuffer` class constructor from `constructor(size: number, pool: PooledBuffer[])` to `constructor(size: number, freeCb: () => void)`. Set `this.freeCb = freeCb;` in the constructor rather than pushing to the pool array directly.

### Step 2: Implement pointers for `freePool`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Near `const freePool: PooledBuffer[] = new Array(POOL_SIZE);`, introduce `let freePoolHead = 0;`.
2. Update the initial `for` loop population to:
```typescript
for (let i = 0; i < POOL_SIZE; i++) {
  const p = new PooledBuffer(INITIAL_BUFFER_SIZE, () => {
    freePool[freePoolHead++] = p;
  });
  freePool[freePoolHead++] = p;
}
```
3. Find all instances of `let pooled = freePool.pop();` and replace them with:
```typescript
let pooled;
if (freePoolHead > 0) {
  pooled = freePool[--freePoolHead];
}
```
4. Find instances of new buffer creation: `pooled = new PooledBuffer(maxBytes + (maxBytes >> 1), freePool);` and replace with:
```typescript
let p;
p = new PooledBuffer(maxBytes + (maxBytes >> 1), () => {
  freePool[freePoolHead++] = p;
});
pooled = p;
```

### Step 3: Implement pointers for `multiFreePool`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Apply the exact same transformation for `multiFreePool`.
Introduce `let multiFreePoolHead = 0;`, update the initial population, replace `multiFreePool.pop()` with `if (multiFreePoolHead > 0) pooled = multiFreePool[--multiFreePoolHead];`, and update inline creations to use closures capturing `p`.

**Why**: Direct index assignment avoids modifying array lengths and avoids dynamic object property resolutions, which is statically analyzable and avoids V8 overhead in tight loops.

## Variations
None.

## Canvas Smoke Test
Run canvas benchmark.

## Correctness Check
Run FFmpeg verify tests to ensure streams are fully intact and pooled buffers are recycled properly.
