---
id: PERF-800
slug: exponential-buffer-growth
status: complete
claimed_by: "Jules"
created: 2026-06-19
completed: "2026-06-24"
result: "discarded"
---

# PERF-800: Exponential Capacity Growth for Base64 Decode Buffer

## Focus Area
`DomStrategy.processCaptureResult` base64 decoding buffer reallocation.

## Background Research
Currently, the `decodeBuffer` in `DomStrategy.ts` is reallocated exactly to `chars` (the base64 string length) whenever `chars > this.decodeBuffer.length`. If the rendered frames are gradually increasing in complexity (and thus file size), this can result in multiple `Buffer.allocUnsafe` calls per second, stalling the event loop and increasing GC pressure. In C++ vectors and Rust vecs, exponential growth (by a factor of 1.5 or 2.0) is the standard approach to guarantee amortized O(1) allocation time for dynamically growing buffers.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: default benchmark settings
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.948s
- **Bottleneck analysis**: Occasional stalls during `Buffer.allocUnsafe` if a complex animation causes frame sizes to incrementally grow over time.

## Implementation Spec

### Step 1: Implement Exponential Growth in `DomStrategy.ts`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `processCaptureResult(result: any)`, modify the reallocation condition:
```typescript
      if (!this.decodeBuffer || chars > this.decodeBuffer.length) {
        const newCapacity = Math.max(chars, (this.decodeBuffer?.length || 0) * 2);
        this.decodeBuffer = Buffer.allocUnsafe(newCapacity);
      }
```
**Why**: Ensures that the buffer capacity grows exponentially, reducing the number of allocations from O(N) to O(log N) as frame sizes increase, providing amortized O(1) reallocation cost.
**Risk**: Slightly higher peak memory usage, which is negligible on modern systems given typical frame sizes (a few megabytes).

## Variations

### Variation A: 1.5x Growth Factor
Instead of `* 2`, use `Math.floor((this.decodeBuffer?.length || 0) * 1.5)` to reduce memory overhead while still retaining logarithmic reallocation bounds.

## Canvas Smoke Test
Ensure the Canvas-to-Video path still works after changes.

## Correctness Check
Run the DOM benchmark and inspect the output video to ensure frames are not corrupted.

## Prior Art
- PERF-798: Pre-allocated Base64 Buffer for DOM Strategy Capture


## Results Summary
```tsv
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	0.000	0	0.00	0.0	discard	PERF-800: Obsolete (Base64 buffer allocation hoisted to CaptureLoop.ts with exponential growth)
```
