---
id: PERF-800
slug: exponential-decode-buffer
status: unclaimed
claimed_by: ""
created: 2024-06-19
completed: ""
result: ""
---

# PERF-800: Exponential Capacity Growth for Base64 Decode Buffer

## Focus Area
Base64 decode buffer reallocation in `DomStrategy.ts` during the Frame Capture Loop. This targets V8 garbage collection overhead caused by repeated buffer reallocations when frame image sizes incrementally increase.

## Background Research
In PERF-798, we optimized the base64 decoding step by pre-allocating a persistent buffer (`decodeBuffer`) and directly writing to it. However, the current logic reallocates `decodeBuffer` using exactly the string length whenever a frame's base64 string is longer than the current buffer capacity. In scenarios where the visual complexity of the DOM incrementally increases over successive frames, the screenshot payload size can grow steadily. This causes the exact-size reallocation logic to trigger repeatedly, causing unnecessary `Buffer.allocUnsafe` calls and subsequent garbage collection. Standard dynamic array implementations solve this by growing capacity exponentially (e.g., by a factor of 1.5x or 2x) when limits are reached.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.948s (from PERF-793)
- **Bottleneck analysis**: The capture fast-path is highly optimized, but slowly growing frame sizes still trigger O(N) memory allocations and copies over time during decoding.

## Implementation Spec

### Step 1: Implement Exponential Growth for `decodeBuffer`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**: In the `processCaptureResult` method, modify the reallocation condition (`if (!this.decodeBuffer || chars > this.decodeBuffer.length)`). When a larger buffer is needed, calculate the new capacity by multiplying the current buffer length by a growth factor (e.g., 1.5). If the current buffer does not exist, use `chars` as the initial size. If the newly calculated capacity is still smaller than `chars`, use `chars`. Allocate the new buffer using `Buffer.allocUnsafe` with this computed capacity.
**Why**: This reduces the reallocation frequency from O(N) to O(log N) as frame sizes increase, reducing garbage collection pressure and `allocUnsafe` overhead in the hot loop.
**Risk**: Slightly higher peak memory usage, as the buffer may be up to 1.5x larger than strictly necessary for the largest frame.

## Variations

### Variation A: Growth Factor of 1.5x vs 2.0x
The Executor should try a growth factor of 1.5 first. If the benchmark shows no significant difference or a regression, a factor of 2.0 can be tested.

## Canvas Smoke Test
Run `npx tsx scripts/benchmark-perf.ts --mode canvas` to ensure changes to the `RenderStrategy` interface or buffer handling do not inadvertently break canvas rendering.

## Correctness Check
Run `npx tsx scripts/verify-trace.ts` to ensure the frames are still accurately decoded without artifacting or truncation.

## Prior Art
- PERF-798: Preallocated base64 buffer optimization.
- PERF-799: Bypassing byte length scanning.
