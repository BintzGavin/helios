---
id: PERF-571
slug: remove-optimize-for-speed
status: unclaimed
claimed_by: ""
created: 2024-06-15
completed: ""
result: ""
---
# PERF-571: Remove `optimizeForSpeed` from intermediate CDP screenshot params

## Focus Area
`DomStrategy.ts` - `cdpScreenshotParams`.

## Background Research
Currently, `DomStrategy` sets `optimizeForSpeed: true` on the intermediate CDP screenshot parameters for `HeadlessExperimental.beginFrame` at line 118: `const cdpScreenshotParams: any = { format, optimizeForSpeed: true };`. In Chromium, enabling `optimizeForSpeed` for JPEG/WebP skips certain compression optimizations (like Huffman table optimization for JPEGs), making the C++ encoding marginally faster but producing a significantly larger image file size (and thus a larger Base64 string).
In our architecture, the primary bottleneck is Playwright CDP IPC serialization/deserialization and Node.js `JSON.parse` overhead for these massive Base64 strings. By removing `optimizeForSpeed: true`, Chromium will spend a fraction of a millisecond more compressing the image, but will yield a smaller Base64 payload. This reduces the IPC transfer time, JSON parsing time in Node.js, and FFmpeg stream buffering, potentially improving the total hot loop latency.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 600 frames, 60fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~0.960s
- **Bottleneck analysis**: Playwright WebSocket IPC throughput and Node.js Base64/JSON parsing overhead.

## Implementation Spec

### Step 1: Remove `optimizeForSpeed: true`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Change:
`const cdpScreenshotParams: any = { format, optimizeForSpeed: true };`
To:
`const cdpScreenshotParams: any = { format };`

**Why**: Allows Chromium to fully compress the intermediate image, reducing the Base64 payload size and consequently the IPC/JSON overhead.
**Risk**: If the CPU cost of the extra compression in Skia exceeds the IPC savings, it might cause a slight regression. We will measure the median render time to confirm.

## Variations
None.

## Canvas Smoke Test
Run canvas benchmark to ensure no regressions.

## Correctness Check
Run standard DOM render tests (`npm run test -w packages/renderer`) to ensure the output video renders correctly and animations advance.
