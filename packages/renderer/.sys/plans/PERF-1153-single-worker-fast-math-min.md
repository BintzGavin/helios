---
id: PERF-1153
slug: single-worker-fast-math-min
status: complete
claimed_by: "jules"
created: 2024-10-30
completed: "2024-10-30"
result: "discarded"
---
# PERF-1153: Eliminate object mutation overhead for base64 writes in single-worker DOM capture

## Focus Area
In `packages/renderer/src/core/CaptureLoop.ts`, the single-worker path for `mode: 'dom'` performs:
```typescript
const rawResult = await nextCapturePromise;
let buf: Buffer = Buffer.from(rawResult as string, "base64");
pendingBytes += buf.length;
```
This forces the JS engine to allocate a new `Buffer` object on every frame for the sole purpose of piping into FFmpeg. Node streams natively support `stream.write(string, encoding)`. Eliminating the intermediate `Buffer.from()` allocation reduces GC pressure and speeds up execution.

## Benchmark Configuration
- **Composition**: Default DOM benchmark
- **Mode**: `dom`
- **Metric**: `render_time_s`
- **Methodology**: 3 runs, median.

## Implementation Spec
1. Modify the main single-worker loop in `packages/renderer/src/core/CaptureLoop.ts` for DOM strategy:
```typescript
const rawResult = await nextCapturePromise;
pendingBytes += rawResult.length;
if (!stream.write(rawResult as string, "base64") && pendingBytes >= 16777216) {
  await this.drainPromise;
  pendingBytes = 0;
}
```
2. Apply the exact same logic to the single-worker final frame logic (`totalFrames > 1` block).
3. Validate tests.

## Results Summary
- **Best render time**: 8.682s (baseline)
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [PERF-1153 direct base64 stream.write]
