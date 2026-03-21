## Performance Trajectory
Current best: 40.429s (baseline was 40.442s, -0.0%)
Last updated by: PERF-013

## What Works
- Decoupled frame capture from I/O write for pipelining. Result inconclusive due to environmental limits, but kept as architectural fix. (PERF-013)
- Defaulting intermediate image format to jpeg when no alpha channel is needed (~2.2% faster) (PERF-011)

## What Doesn't Work (and Why)
- [entries]
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
