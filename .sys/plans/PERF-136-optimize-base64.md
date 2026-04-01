---
id: PERF-136
slug: optimize-base64
status: unclaimed
claimed_by: ""
created: 2026-03-31
completed: ""
result: ""
---
# PERF-136: Optimize base64 decoding with `Buffer.from()`

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts` `writeToBufferPool` method. Specifically targeting the base64 string to Buffer decoding performance.

## Background Research
Currently, `DomStrategy.ts` uses `Buffer.allocUnsafe` combined with `captureBuffer.write(screenshotData, 'base64')` to convert the CDP screenshot base64 string into a Buffer.

This was introduced in PERF-094 to avoid `Buffer.byteLength()` and reuse a buffer pool (though the buffer pool reuse was later removed in PERF-107 in favor of straight `Buffer.allocUnsafe` due to memory corruption in concurrent multi-worker environments).

However, benchmarking the `allocUnsafe` + `.write` approach against a simple `Buffer.from(screenshotData, 'base64')` call in Node.js v22 shows that `Buffer.from` is actually ~20-25% faster for 1MB base64 strings:
```
allocUnsafe + write: 289.415 ms
Buffer.from: 237.644 ms
```

Since the static buffer pool was removed in PERF-107, we are allocating a new buffer on every frame anyway. By switching back to `Buffer.from()`, we can leverage the highly optimized C++ V8 binding for base64 decoding which is faster than manually allocating and writing.

## Benchmark Configuration
- **Composition URL**: `output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.6s
- **Bottleneck analysis**: CPU overhead in the hot loop when converting large base64 strings to Buffers. Node.js native `Buffer.from` is more optimized than manual allocation and writing.

## Implementation Spec

### Step 1: Replace `writeToBufferPool` with `Buffer.from`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `writeToBufferPool` method, replace the manual allocation and write logic with a direct call to `Buffer.from()`. We can keep the method name the same for simplicity.

```typescript
  private writeToBufferPool(screenshotData: string): Buffer {
    return Buffer.from(screenshotData, 'base64');
  }
```

**Why**: `Buffer.from` uses highly optimized C++ V8 bindings for base64 decoding and allocation, which benchmarks show is 20-25% faster than manually using `Buffer.allocUnsafe` and `buffer.write()`.
**Risk**: None. `Buffer.from` is memory safe and correctly handles base64 padding.

## Correctness Check
Run the renderer benchmark script `npx tsx packages/renderer/test-benchmark.ts` to verify DOM rendering succeeds.
