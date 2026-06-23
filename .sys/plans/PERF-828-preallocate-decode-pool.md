---
id: PERF-828
slug: preallocate-decode-pool
status: unclaimed
claimed_by: ""
created: 2026-06-23
completed: ""
result: ""
---

# PERF-828: Enlarge and Pre-allocate Base64 Pool for Hot Paths

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` Base64 decode pool initialization (`freePool` and `multiFreePool`).

## Background Research
In both the single and multi-worker paths, `CaptureLoop.ts` decodes Chromium's CDP Base64 image strings into binary buffers before writing them to `ffmpegManager.stdin`. It does this using memory pools of `PooledBuffer` instances to avoid GC pressure.
However, if the buffer in the pool is too small to hold the decoded Base64 string, it dynamically allocates a new `PooledBuffer` in the hot loop:
```typescript
                        let pooled = multiFreePool.pop();
                        if (!pooled || pooled.buffer.length < maxBytes) {
                            pooled = new PooledBuffer(maxBytes + (maxBytes >> 1), multiFreePool);
                        }
```
The pool is currently initialized with a hardcoded size of `512 * 1024` (512KB). For a 1080p frame, the Base64 representation and resulting buffer can easily exceed 512KB. A complex frame will force dynamic allocation on *every* frame in the path until the pool gradually resizes itself, causing heavy GC pressure and `allocUnsafe` delays during the initial render phase.

We can solve this by calculating the maximum uncompressed size from the frame dimensions (`options.width * options.height * 4` for 32-bit RGBA) and allocating that upfront. This guarantees the initial allocations are large enough for the target resolution, fully preventing the `if` branch reallocation in the hot loop from ever triggering.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.831s
- **Bottleneck analysis**: V8 garbage collection and `Buffer.allocUnsafe` overhead during the first few seconds of capture loops due to undersized `PooledBuffer` initialization causing reallocation branches to fire.

## Implementation Spec

### Step 1: Initialize buffer pools using target resolution
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In both the single-worker and multi-worker pool initialization sections, replace the fixed `512 * 1024` with a size calculated from the configuration options.

For the single-worker path:
```typescript
        const POOL_SIZE = 64;
        const INITIAL_BUFFER_SIZE = Math.max(512 * 1024, (this.options.width * this.options.height * 4));
        const freePool: PooledBuffer[] = new Array(POOL_SIZE);
        for (let i = 0; i < POOL_SIZE; i++) {
            freePool[i] = new PooledBuffer(INITIAL_BUFFER_SIZE, freePool);
        }
```

For the multi-worker path:
```typescript
    const MULTI_POOL_SIZE = 64;
    const MULTI_INITIAL_BUFFER_SIZE = Math.max(512 * 1024, (this.options.width * this.options.height * 4));
    const multiFreePool: PooledBuffer[] = new Array(MULTI_POOL_SIZE);
    for (let i = 0; i < MULTI_POOL_SIZE; i++) {
        multiFreePool[i] = new PooledBuffer(MULTI_INITIAL_BUFFER_SIZE, multiFreePool);
    }
```

**Why**: By over-allocating upfront using the resolution max size, we guarantee that `pooled.buffer.length < maxBytes` will *never* be true, fully bypassing the runtime reallocation branch in the hot loop.
**Risk**: Slightly higher initial memory footprint (e.g. `1920*1080*4*64 = ~500MB`). Since `allocUnsafe` is used and it's initialized upfront, it's fast and will simply reserve the memory once per run.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx scripts/benchmark-perf.ts --mode canvas` to ensure `canvas` mode is not broken.

## Correctness Check
Run the `dom` mode benchmark script to verify successful rendering.

## Prior Art
- PERF-815: Introduced the `multiFreePool` Base64 mechanism, but hardcoded 512KB.
