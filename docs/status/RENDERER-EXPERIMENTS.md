## Performance Trajectory
Current best: 32.324s (baseline was 3.696s)
Last updated by: PERF-030

## What Works
- [PERF-030] Enforced worker-local sequential promise chaining for frame capture loop. While removing the concurrent queue depth of `pool.length * 8` from PERF-029 degrades render time, it guarantees that `seek` and `capture` actions on a Playwright page evaluate sequentially, fixing a critical race condition. (Render time: 32.324s vs baseline 3.696s)
- [PERF-029] Increased the active pipeline depth constraint in the frame capture loop from `pool.length` to `pool.length * 8`. This pushes more frame capture requests into the Node.js event loop and Chromium CDP queue, reducing wait times and better saturating the FFmpeg ingestion pipe. Render time is 3.696s (baseline 34.040s).
- [PERF-028] Eliminated array allocations in the `SeekTimeDriver` CDPSession frame evaluation loop by replacing `frames.map` with a localized `for` loop pushing promises to a pre-allocated array. Reduces V8 garbage collection pressure and serialization delays. Render time remained stable (32.584s vs baseline 32.589s).
- [PERF-027] Optimized Playwright page pool concurrency. Increased the page pool size limit by over-subscribing CPU cores (1.5x, max 8) and doubled the active pipeline depth constraint from `pool.length` to `pool.length * 2`. Reduces wall-clock rendering time by better interleaving I/O operations and keeping the FFmpeg encoding pipeline saturated. Render time improved to 3.576s.
- [PERF-025] Bypassed Playwright IPC abstraction by using CDPSession's Runtime.evaluate directly for time synchronization in SeekTimeDriver. Reduces string serialization overhead per frame. Render time improved (from 32.772s to 32.718s, -0.16%).
- [PERF-024] Optimized SeekTimeDriver by removing an unnecessary final `requestAnimationFrame` wait. Reduced render time to 33.787s (vs baseline 34.011s, -0.6%).
- [PERF-023] Optimized array allocations in SeekTimeDriver by replacing .forEach closures with standard for loops. Render time improved (from ~43.838s to 32.815s, -25.1%).
- [PERF-022] Cached expensive DOM traversal elements `findAllScopes` and `findAllMedia` upon first access in `SeekTimeDriver.ts`. Reduces redundant DOM traversal per frame via `document.createTreeWalker`. Reduced render time to 32.794s (vs baseline 34.400s, -4.7%).
- [PERF-021] Optimized redundant `requestAnimationFrame` waits in SeekTimeDriver and DomStrategy, dropping capture idle wait. Reduced render time to 32.833s (vs baseline 35.281s, -6.9%).
- Pre-compile SeekTimeDriver evaluate script. Passing the arguments directly to the evaluation function avoids repetitive string serialization and V8 compilation overhead per frame (~0.2% faster). (PERF-018)
- Decoupled frame capture from I/O write for pipelining. Result inconclusive due to environmental limits, but kept as architectural fix. (PERF-013)
- Defaulting intermediate image format to jpeg when no alpha channel is needed (~2.2% faster) (PERF-011)

## What Doesn't Work (and Why)
- [entries]
- [PERF-026] Replaced sequential `Page.captureScreenshot` with push-based `Page.startScreencast` in `DomStrategy`. This architectural change fundamentally breaks the frame-by-frame synchronization required for rendering video because Chrome's `Page.startScreencast` is damage-driven (only emits frames on visual changes). This results in indefinite hangs during static scenes or when target selectors are missing. It is fundamentally incompatible with the renderer's strict sequential capture loop.
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
