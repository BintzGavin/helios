## Performance Trajectory
Current best: 1.831s (baseline was 1.831s, -0%)
Last updated by: PERF-822

## What Works
- Eliminated `i+1 < totalFrames` branch check from chunked inner single-worker fast paths in CaptureLoop.ts by evaluating it outside the loop (PERF-822)
- PERF-822: Track pending stream bytes locally to avoid calling `stream.writableState.length` getter in hot loop (~15% faster microbenchmark iteration)

## What Doesn't Work (and Why)

## Open Questions
