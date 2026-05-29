## Performance Trajectory
Current best: 2.573s (baseline was 13.003s, -80.2%)
Last updated by: PERF-508

## What Works
- [PERF-508] Optimized Playwright concurrency by setting it to exactly 1. Because Helios disables site isolation for performance, all pages share the same renderer process. Using multiple workers caused severe thread contention and IPC queueing latency within the single Chromium process. Forcing concurrency to 1 eliminated this overhead (~80.2% faster).
- [PERF-271] Combined `.catch` and `.then` handlers into a single `.then(resolve, reject)` in `CaptureLoop.ts` to reduce GC overhead and microtask serialization delays (~26.9% faster).

## What Doesn't Work (and Why)
- [PERF-466] Attempted to return direct promise chain in CdpTimeDriver.runSetTime instead of using async/await. DISCARDED because performance did not improve (median 23.91s vs 20.43s baseline). The overhead of async/await state machine in the hot loop is negligible compared to other factors like IPC, and the structural change slightly degraded execution time.
- [PERF-409] Attempted to replace `Promise.race` with a manual wrapper promise in `CdpTimeDriver.ts` stability check. DISCARDED as IMPOSSIBLE DUPLICATION. Previous experiments (PERF-361/PERF-411) showed V8 handles Promise.race arrays very efficiently, and manual tracking adds overhead.
- [PERF-361] Attempted to avoid `Promise.race` allocation in `SeekTimeDriver` injected script. DISCARDED because it was slower (48.761s vs 46.298s baseline). V8 handles the Promise.race array wrapper very efficiently, and the manual state machine added overhead.

## Open Questions
- [PERF-306] Attempted to disable renderer backgrounding (`--disable-renderer-backgrounding`, `--disable-backgrounding-occluded-windows`) to improve multi-worker actor model performance. DISCARDED. Resulted in significantly slower performance (42.335s vs ~32.1s baseline). Disabling backgrounding heuristics in the multi-process microVM environment appears to cause resource contention or CPU starvation rather than improving throughput.
