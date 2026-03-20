## Performance Trajectory
Current best: 40.429s (baseline was 40.442s, -0.0%)
Last updated by: PERF-013

## What Works
- Decoupled frame capture from I/O write for pipelining. Result inconclusive due to environmental limits, but kept as architectural fix. (PERF-013)
- Defaulting intermediate image format to jpeg when no alpha channel is needed (~2.2% faster) (PERF-011)

## What Doesn't Work (and Why)
- [entries]
- Conditionally using `jpeg_pipe` format with `mjpeg` codec for FFmpeg ingestion when intermediate image format is `jpeg`. The render time degraded (47.85s vs 46.706s). It appears that bypassing FFmpeg stream probing doesn't offset other ingestion/decoding overhead in this environment. (PERF-012)

## Open Questions
- [entries]
