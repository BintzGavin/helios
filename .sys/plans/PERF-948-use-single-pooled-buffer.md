---
id: PERF-948
slug: use-single-pooled-buffer
status: unclaimed
claimed_by: ""
created: 2024-07-08
completed: ""
result: ""
---

# PERF-948: Use Single PooledBuffer for Base64 Writes

## Focus Area
Base64 string encoding loops in `CaptureLoop.ts` across single and multi-worker paths.

## Background Research
Currently, base64 strings generated during `isDomStrategy` paths are written to node streams using a custom linked-list pool of pre-allocated buffers (`PooledBuffer`).
However, node `stream.write` copies chunk contents synchronously and returns immediately unless backpressure is hit (in which case we await). The linked-list pool was initially implemented with the assumption that `write(chunk, cb)` might hold references to chunks asynchronously.
Testing and node internals verify that `stream.write(buffer)` copies data into its internal queue. It does NOT hold references to the user-space buffer once the write call returns (or after the immediate chunk processing). Thus, maintaining a pool of 64 buffers (both `freePool` and `multiFreePool`) and doing linked-list pointer logic (`head = pooled.next`, `poolObj.head = this`) per frame adds unnecessary overhead.

We can replace the entire linked list pool with a single `PooledBuffer` instance per loop context (single and multi), reusing the same exact buffer instance for every frame. When a frame base64 length exceeds the single buffer's size, we reallocate it.

Microbenchmarks demonstrate that bypassing linked-list access patterns and just doing `const written = singleBuffer.buffer.write(str, "base64"); stream.write(singleBuffer.buffer.subarray(0, written))` eliminates linked list node tracking and free callback overhead, offering a measurable improvement in the hottest write paths.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Linked list pointer overhead `multiFreePool.head = pooled.next` and closure free callback overhead in hot V8 write loops for every frame.

## Implementation Spec

### Step 1: Replace Multi-Worker Pool with Single Buffer
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Around line 857, remove:
```typescript
      const MULTI_POOL_SIZE = 64;
      const MULTI_INITIAL_BUFFER_SIZE = Math.max(
        512 * 1024,
        this.options.width * this.options.height * 4,
      );
      const multiFreePool = { head: null as PooledBuffer | null };
      for (let i = 0; i < MULTI_POOL_SIZE; i++) {
        const node = new PooledBuffer(MULTI_INITIAL_BUFFER_SIZE, multiFreePool);
        node.next = multiFreePool.head;
        multiFreePool.head = node;
      }
```
Replace with:
```typescript
      const MULTI_INITIAL_BUFFER_SIZE = Math.max(
        512 * 1024,
        this.options.width * this.options.height * 4,
      );
      // Dummy pool object since freeCb is no longer used but required by constructor
      let singleMultiPooled = new PooledBuffer(MULTI_INITIAL_BUFFER_SIZE, { head: null });
```

Then, in the multi-worker loop (around line 1151 and 1240), replace:
```typescript
              let pooled = multiFreePool.head;
              if (pooled) multiFreePool.head = pooled.next;
              if (!pooled || pooled.size < maxBytes) {
                pooled = new PooledBuffer(maxBytes + (maxBytes >> 1), multiFreePool);
              }
              const written = pooled.buffer.write(str, "base64"); // or buffer
              const chunk = pooled.buffer.subarray(0, written);
              pendingBytes += written;
              writeSuccess = stream.write(chunk, pooled.freeCb);
```
With:
```typescript
              if (singleMultiPooled.size < maxBytes) {
                singleMultiPooled = new PooledBuffer(maxBytes + (maxBytes >> 1), { head: null });
              }
              const written = singleMultiPooled.buffer.write(str, "base64");
              const chunk = singleMultiPooled.buffer.subarray(0, written);
              pendingBytes += written;
              writeSuccess = stream.write(chunk);
```

### Step 2: Replace Single-Worker Pool with Single Buffer
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Around line 192, remove:
```typescript
      const POOL_SIZE = 64;
      const INITIAL_BUFFER_SIZE = Math.max(
        512 * 1024,
        this.options.width * this.options.height * 4,
      );
      const freePool = { head: null as PooledBuffer | null };
      for (let i = 0; i < POOL_SIZE; i++) {
        const node = new PooledBuffer(INITIAL_BUFFER_SIZE, freePool);
        node.next = freePool.head;
        freePool.head = node;
      }
```
Replace with:
```typescript
      const INITIAL_BUFFER_SIZE = Math.max(
        512 * 1024,
        this.options.width * this.options.height * 4,
      );
      let singlePooled = new PooledBuffer(INITIAL_BUFFER_SIZE, { head: null });
```
Then update all 10 instances in the single-worker path that use `let pooled = freePool.head; ... stream.write(chunk, pooled.freeCb);` to use `singlePooled` and `stream.write(chunk)`.

**Why**: Simplifies V8 allocations and branch checks.

## Variations
None.

## Canvas Smoke Test
None needed.

## Correctness Check
Run \`npm run test -w packages/renderer\`.
