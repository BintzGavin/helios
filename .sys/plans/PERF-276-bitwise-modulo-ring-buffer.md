---
id: PERF-276
slug: bitwise-modulo-ring-buffer
status: unclaimed
claimed_by: ""
created: 2026-04-14
completed: ""
result: ""
---

# PERF-276: Bitwise Modulo Ring Buffer in CaptureLoop

## Focus Area
The `CaptureLoop.ts` hot loop which processes frames in a sliding window (ring buffer) pipeline. Currently, indexing into the ring buffer involves modulo (`%`) operators which are known to be slightly slower than bitwise `&` masks.

## Background Research
Modulo division in JavaScript `a % b` is relatively expensive compared to a bitwise AND `a & (b - 1)` given that `b` is a power of two.
In `packages/renderer/src/core/CaptureLoop.ts`, `maxPipelineDepth` is initialized as `poolLen * 2` and then explicitly padded to the nearest power of two via `maxPipelineDepth = Math.pow(2, Math.ceil(Math.log2(maxPipelineDepth)));`. Since it's guaranteed to be a power of two, `frameIndex % maxPipelineDepth` and `nextFrameToWrite % maxPipelineDepth` can be replaced mathematically safely with `frameIndex & (maxPipelineDepth - 1)` and `nextFrameToWrite & (maxPipelineDepth - 1)`.

## Benchmark Configuration
- **Composition URL**: `file://.../output/example-build/examples/dom-benchmark/composition.html`
- **Render Settings**: `1280x720`, `30fps`, `3 seconds`
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.075s
- **Bottleneck analysis**: Microtask and logic execution in the hot frame capturing loop.

## Implementation Spec

### Step 1: Precompute Ring Mask
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `run()` function, compute `ringMask` based on `maxPipelineDepth`:
```typescript
    let maxPipelineDepth = poolLen * 2;
    maxPipelineDepth = Math.pow(2, Math.ceil(Math.log2(maxPipelineDepth)));
    const ringMask = maxPipelineDepth - 1;
    const timeStep = 1000 / fps;
```
**Why**: Avoid calculating `maxPipelineDepth - 1` on every iteration.
**Risk**: Negligible. It's standard JS math.

### Step 2: Replace `%` with `&` in the Ring Buffer Indices
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Replace `frameIndex % maxPipelineDepth` with `frameIndex & ringMask`:
```typescript
            const ringIndex = frameIndex & ringMask;
```

Replace `nextFrameToWrite % maxPipelineDepth` with `nextFrameToWrite & ringMask`:
```typescript
        const buffer = await framePromises[nextFrameToWrite & ringMask]!;
```

Leave the `worker` modulo indexing unchanged:
```typescript
            const worker = this.pool[frameIndex % poolLen];
```
Because `poolLen` might not be a power of two.

**Why**: Modulo division (`%`) is relatively expensive and forces the V8 engine to do slightly more work compared to bitwise bitmasks (`&`). We already ensure the `maxPipelineDepth` is a power of 2, so the condition holds true.
**Risk**: None. It's mathematically identical for positive numbers.

## Prior Art
- `PERF-236-bitwise-modulo-ring-buffer.md`
