## Performance Trajectory
Current best: 32.794s (baseline was 34.400s, -4.7%)
Last updated by: PERF-022

## What Works
- [PERF-022] Cached expensive DOM traversal elements `findAllScopes` and `findAllMedia` upon first access in `SeekTimeDriver.ts`. Reduces redundant DOM traversal per frame via `document.createTreeWalker`. Reduced render time to 32.794s (vs baseline 34.400s, -4.7%).
- [PERF-021] Optimized redundant `requestAnimationFrame` waits in SeekTimeDriver and DomStrategy, dropping capture idle wait. Reduced render time to 32.833s (vs baseline 35.281s, -6.9%).
- Pre-compile SeekTimeDriver evaluate script. Passing the arguments directly to the evaluation function avoids repetitive string serialization and V8 compilation overhead per frame (~0.2% faster). (PERF-018)
- Decoupled frame capture from I/O write for pipelining. Result inconclusive due to environmental limits, but kept as architectural fix. (PERF-013)
- Defaulting intermediate image format to jpeg when no alpha channel is needed (~2.2% faster) (PERF-011)

## What Doesn't Work (and Why)
- [entries]
- Explicitly specifying the video input codec (`-vcodec mjpeg` or `webp`) for FFmpeg `image2pipe` to bypass probing. The render time did not improve and remained identical within noise margins (36.605s vs 36.547s baseline). The CPU overhead in `image2pipe` probing is negligible compared to Playwright IPC and frame capture overhead in this microVM. (PERF-020)
- Enabling `optimizeForSpeed: true` in CDP `Page.captureScreenshot` params. The render time and peak memory consumption remained identical within noise margins (35.455s vs 35.141s baseline). The underlying Chromium build might not effectively support or prioritize this flag in headless mode for this CPU-only microVM. (PERF-019)
- Defaulting FFmpeg preset to `ultrafast`. The render time remained identical within noise margins (46.161s vs 46.307s baseline). In this CPU-bound microVM, DOM frame capture and IPC appear to be the dominant bottlenecks, making the encoding preset negligible. (PERF-014)
- Conditionally using `jpeg_pipe` format with `mjpeg` codec for FFmpeg ingestion when intermediate image format is `jpeg`. The render time degraded (47.85s vs 46.706s). It appears that bypassing FFmpeg stream probing doesn't offset other ingestion/decoding overhead in this environment. (PERF-012)

## Open Questions
- [entries]

## Performance Trajectory
Current best: 35.156s (baseline was 35.555s, -1.1%)
Last updated by: PERF-016

## What Works
- [PERF-016] Changed the default intermediate image format to 'webp' when an alpha channel is needed. It reduces IPC overhead and is faster to encode/decode than 'png'.
- [PERF-015] Instantiating a pool of multiple Playwright pages based on CPU concurrency and dividing frames between them using a sliding window. It allows concurrent evaluation of `strategy.capture()` across workers, cutting ~23% off render time.
