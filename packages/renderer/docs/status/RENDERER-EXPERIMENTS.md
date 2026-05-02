## Performance Trajectory
Current best: 32.105s (baseline was 43.939s, -26.9%)
Last updated by: PERF-271

## What Works
- [PERF-271] Combined `.catch` and `.then` handlers into a single `.then(resolve, reject)` in `CaptureLoop.ts` to reduce GC overhead and microtask serialization delays (~26.9% faster).

## What Doesn't Work (and Why)
- [PERF-409] Attempted to replace `Promise.race` with a manual wrapper promise in `CdpTimeDriver.ts` stability check. DISCARDED as IMPOSSIBLE DUPLICATION. Previous experiments (PERF-361/PERF-411) showed V8 handles Promise.race arrays very efficiently, and manual tracking adds overhead.
- [PERF-361] Attempted to avoid `Promise.race` allocation in `SeekTimeDriver` injected script. DISCARDED because it was slower (48.761s vs 46.298s baseline). V8 handles the Promise.race array wrapper very efficiently, and the manual state machine added overhead.

## Open Questions
