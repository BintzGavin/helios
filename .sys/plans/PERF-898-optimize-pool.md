---
id: PERF-898
slug: optimize-pool-pop-head
status: unclaimed
claimed_by: ""
created: 2024-07-02
completed: ""
result: ""
---

# PERF-898: Optimize array pooling with manual pointers for Base64 string decode

## Focus Area
`multiFreePool` and `freePool` in `CaptureLoop.ts` allocate pooled buffers for Base64 decoding.

## Background Research
Currently, when buffering `dom` frame outputs to convert from Base64 into Buffers, `CaptureLoop` uses pooled buffers like `multiFreePool` and `freePool`. To grab a buffer, it relies on array `.pop()` and `pool.push(this)`.
Array `.pop()` and `.push()` in V8 incur dynamic property resolution and size check overhead compared to direct array index manipulation via a `head` integer pointer. Microbenchmarks demonstrating `pool.pop()` vs an explicit `if (head > 0) pooled = pool[--head]` pattern show a 30% reduction in loop execution time (from ~1063ms to ~713ms for 50M iterations). For CPU-bound Base64 decoding, saving array operations yields lower overhead in the DOM rendering hot path.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark
- **Render Settings**: 1080p, 60fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Overhead from using V8 array `push`/`pop` vs direct integer indexed arrays.

## Implementation Spec

### Step 1: Modify `PooledBuffer` to take a `freeCb` closure instead of the pool array
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Update `PooledBuffer` class constructor from `constructor(size: number, pool: PooledBuffer[])` to `constructor(size: number, freeCb: () => void)`. Set `this.freeCb = freeCb;` in the constructor rather than pushing to the pool array directly.

### Step 2: Implement pointers for `freePool` in single-worker paths
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Near `const freePool: PooledBuffer[] = new Array(POOL_SIZE);`, introduce `let freePoolHead = POOL_SIZE;`.
2. Update the initial `for` loop population to:
```typescript
for (let i = 0; i < POOL_SIZE; i++) {
  const p = new PooledBuffer(INITIAL_BUFFER_SIZE, () => {
    freePool[freePoolHead++] = p;
  });
  freePool[i] = p;
}
```
3. Find all instances of `let pooled = freePool.pop();` and replace them with:
```typescript
let pooled: PooledBuffer | undefined;
if (freePoolHead > 0) {
  pooled = freePool[--freePoolHead];
}
```
4. Find instances of new buffer creation when the pool exhausts or size changes: `pooled = new PooledBuffer(maxBytes + (maxBytes >> 1), freePool);` and replace with:
```typescript
let p: PooledBuffer | undefined;
p = new PooledBuffer(maxBytes + (maxBytes >> 1), () => {
  freePool[freePoolHead++] = p!;
});
pooled = p;
```

### Step 3: Implement pointers for `multiFreePool` in multi-worker paths
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Apply the exact same transformation for `multiFreePool`:
1. Add `let multiFreePoolHead = MULTI_POOL_SIZE;`.
2. Update initial population to use the new closure `multiFreePool[multiFreePoolHead++] = p;`.
3. Replace `multiFreePool.pop()` with an `if (multiFreePoolHead > 0) pooled = multiFreePool[--multiFreePoolHead];` block.
4. Update inline creation for exhausted/resized pools to capture the new buffer reference in a closure.

**Why**: Direct index assignment is statically analyzable and avoids modifying array lengths, which incurs less V8 overhead than dynamic array pushes/pops in tight loops.

## Variations
None.

## Canvas Smoke Test
Run a basic canvas test to ensure no shared paths break.

## Correctness Check
Run FFmpeg verify tests (e.g., shadow dom sync tests) to ensure streams are fully intact and memory isn't leaking (which would happen if `freeCb` failed to recycle buffers).
