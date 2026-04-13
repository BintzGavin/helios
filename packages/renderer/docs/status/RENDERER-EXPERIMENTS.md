## Performance Trajectory
Current best: 32.105s (baseline was 43.939s, -26.9%)
Last updated by: PERF-271

## What Works
- [PERF-271] Combined `.catch` and `.then` handlers into a single `.then(resolve, reject)` in `CaptureLoop.ts` to reduce GC overhead and microtask serialization delays (~26.9% faster).

## What Doesn't Work (and Why)

## Open Questions
