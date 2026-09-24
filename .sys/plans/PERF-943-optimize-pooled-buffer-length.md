---
id: PERF-943
slug: optimize-pooled-buffer-length
status: unclaimed
claimed_by: ""
created: 2025-02-23
completed: ""
result: ""
---

# PERF-943: Optimize Pooled Buffer Length Access

## Focus Area
The buffer allocation checking blocks in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, eliminating the dynamic `pooled.buffer.length < maxBytes` checks in the single-worker and multi-worker loops by tracking the buffer length directly on the `PooledBuffer` instance rather than accessing the `Buffer` object's `.length` property.

## Background Research
Currently in `CaptureLoop.ts`, buffer pooling logic uses this pattern:
```typescript
let pooled = freePool.head;
if (pooled) freePool.head = pooled.next;
if (!pooled || pooled.buffer.length < maxBytes) {
  pooled = new PooledBuffer(maxBytes + (maxBytes >> 1), freePool);
}
```

Accessing `.length` on a native Node.js `Buffer` object (which `pooled.buffer` is) requires V8 to traverse the object properties and potentially cross the C++ boundary. By adding a `size` property directly on the `PooledBuffer` class (`this.size = bufferSize`) and checking `pooled.size < maxBytes`, we can keep the hot loop evaluation entirely in V8's fast-path integer realm.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark
- **Render Settings**: 1080p, 60FPS
- **Mode**: `dom` (with 1 and 4 workers)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Micro-overhead from accessing `.length` on `Buffer` objects in the innermost loop across all rendered frames.

## Implementation Spec

### Step 1: Add `size` property to `PooledBuffer` class
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `PooledBuffer` class definition (around lines 53-57), add a `public size: number` property and initialize it in the constructor (`this.size = size;`).
**Why**: Caches the buffer size in a simple integer property on the JS object.

### Step 2: Replace `.buffer.length` with `.size`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Across all occurrences in the `CaptureLoop.ts` single and multi-worker loops, replace:
`if (!pooled || pooled.buffer.length < maxBytes)`
with:
`if (!pooled || pooled.size < maxBytes)`
**Why**: Avoids hitting the `Buffer` object's property getter, speeding up the fast path.

## Correctness Check
Run `npm run build && npm run test -w packages/renderer` to ensure pooling behavior remains structurally identical and frames are not improperly truncated.
