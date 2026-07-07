# RENDERER Context
I will write some context here to help guide my plan. I need to write a PERF plan.
## Performance Trajectory
Current best: ~500ms (from journals)
Last updated by: PERF-945

## What Works
- **PERF-945**: Optimized multi-worker and single-worker pooled buffer length access in CaptureLoop.ts by tracking buffer length directly on the PooledBuffer instance.
  - **Improvement**: Replaced `pooled.buffer.length < maxBytes` with `pooled.size < maxBytes`. Caching the size parameter locally on the V8 class bypassed the native Node.js Buffer `.length` property getter cross-boundary penalty, improving access speed by ~51% in hot microbenchmarks (86ms vs 176ms).
  - **Plan ID**: PERF-945
