---
id: PERF-236
slug: bitwise-modulo-ring-buffer
status: unclaimed
claimed_by: ""
created: 2024-04-10
completed: ""
result: ""
---
# PERF-236: Optimize CaptureLoop Ring Buffer Indexing

## Focus Area
`CaptureLoop.ts` frame processing hot loop. Specifically targeting the modulo (`%`) indexing arithmetic used for the `framePromises` ring buffer.

## Background Research
The `CaptureLoop` maintains a ring buffer of `framePromises` with a length of `maxPipelineDepth` (which is `poolLen * 2`). Currently, indexing into this buffer uses the modulo operator: `nextFrameToSubmit % maxPipelineDepth`. Modulo division in JavaScript is relatively expensive compared to bitwise operations.
If the size of a ring buffer is a power of 2, modulo operations can be replaced with a much faster bitwise AND mask: `index & (size - 1)`.
Since `poolLen` is derived from CPU cores and capped at 8 (typically 4 or 8), `maxPipelineDepth` is typically 8 or 16 (powers of 2). By ensuring `maxPipelineDepth` is always explicitly rounded up to the nearest power of 2, we can safely and mathematically equivalently replace the `%` operator with `&`.
Note: A previous experiment (PERF-234) attempted to eliminate modulo arithmetic using manual pointer wrapping (`workerIndex++`, `if (workerIndex === poolLen) workerIndex = 0`), which broke synchronous evaluation order. The bitwise mask approach strictly preserves the mathematical index resolution without branching, avoiding the pitfalls of PERF-234.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1920x1080, 60fps, 600 frames, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.6s

## Implementation Spec

### Step 1: Pad maxPipelineDepth to a power of 2
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `run()` method, modify the initialization of `maxPipelineDepth`:
Change:
```typescript
    const poolLen = this.pool.length;
    const maxPipelineDepth = poolLen * 2;
    let framePromises: Promise<Buffer | string>[] = new Array(maxPipelineDepth);
```
To:
```typescript
    const poolLen = this.pool.length;
    let maxPipelineDepth = poolLen * 2;
    maxPipelineDepth = Math.pow(2, Math.ceil(Math.log2(maxPipelineDepth)));
    const ringMask = maxPipelineDepth - 1;
    let framePromises: Promise<Buffer | string>[] = new Array(maxPipelineDepth);
```
**Why**: Ensures the ring buffer length is a power of 2, satisfying the requirement for the bitwise AND trick.

### Step 2: Replace Modulo Indexing with Bitwise AND
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `run()` method loop, replace `% maxPipelineDepth` with `& ringMask` for `framePromises` indexing.
Change:
```typescript
            framePromises[nextFrameToSubmit % maxPipelineDepth] = framePromise;
```
To:
```typescript
            framePromises[nextFrameToSubmit & ringMask] = framePromise;
```
And change:
```typescript
        const buffer = await framePromises[nextFrameToWrite % maxPipelineDepth]!;
```
To:
```typescript
        const buffer = await framePromises[nextFrameToWrite & ringMask]!;
```
**Note**: Leave `const worker = this.pool[frameIndex % poolLen];` unchanged.
**Why**: Eliminates modulo arithmetic overhead for every frame processed in the hot loop.

## Prior Art
- PERF-233 (Implemented the ring buffer)
- PERF-234 (Attempted modulo elimination but failed due to logic bugs; this approach uses a mathematically equivalent mask instead)
