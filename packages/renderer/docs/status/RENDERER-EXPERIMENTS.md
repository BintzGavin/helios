## Performance Trajectory
Current best: 2.573s (baseline was 13.003s, -80.2%)
Last updated by: PERF-823

## What Works
- [PERF-936] Replaced inline conditional `chunkEnd` boundary calculations with `Math.min()` in `CaptureLoop.ts` single and multi-worker fast paths.
  - **Improvement:** ~59% reduction in loop boundary evaluation time (from ~65.96ms to ~26.86ms for 10M iterations). V8 converts `Math.min` into a branchless conditional move, eliminating branch prediction penalties for chunk boundary logic.
  - **Plan ID:** PERF-936
- [PERF-884] Unrolled `isString` dynamic type check in the multi-worker capture loops of `CaptureLoop.ts` by replacing `typeof buffer === 'string'` with `isDomStrategyWriter || typeof buffer === 'string'`. It eliminated per-iteration V8 type checking overhead for DOM strategies, yielding a ~25% improvement in microbenchmarks (from ~315ms to ~235ms for 100M iterations).
- [PERF-823] Hoisted `nextFrameToWrite < totalFrames` branch and internal progress checks in the multi-worker capture hot path (`CaptureLoop.ts`) by grouping frames into chunks based on `progressInterval`. It eliminates per-frame branch prediction overhead similarly to PERF-822, yielding an 80% improvement in multi-worker tight-loop microbenchmarks.
- [PERF-508] Optimized Playwright concurrency by setting it to exactly 1. Because Helios disables site isolation for performance, all pages share the same renderer process. Using multiple workers caused severe thread contention and IPC queueing latency within the single Chromium process. Forcing concurrency to 1 eliminated this overhead (~80.2% faster).
- [PERF-271] Combined `.catch` and `.then` handlers into a single `.then(resolve, reject)` in `CaptureLoop.ts` to reduce GC overhead and microtask serialization delays (~26.9% faster).

## What Doesn't Work (and Why)

- PERF-912 attempted to replace omitted-initializer `for (; i < chunkEnd; i++)` loops with strict `while (i < chunkEnd) { ... i++ }` blocks in `CaptureLoop.ts` fast loops. However, the plan actually says "Unroll Progress Check inside Single and Multi-Worker Inner Fast Loops" and the progress check was already unrolled in the codebase (the chunking logic was already there). We discarded this change as it was a hallucinated task and introduced maintainability risks (infinite loops if a `continue` was added).
- [PERF-466] Attempted to return direct promise chain in CdpTimeDriver.runSetTime instead of using async/await. DISCARDED because performance did not improve (median 23.91s vs 20.43s baseline). The overhead of async/await state machine in the hot loop is negligible compared to other factors like IPC, and the structural change slightly degraded execution time.
- [PERF-409] Attempted to replace `Promise.race` with a manual wrapper promise in `CdpTimeDriver.ts` stability check. DISCARDED as IMPOSSIBLE DUPLICATION. Previous experiments (PERF-361/PERF-411) showed V8 handles Promise.race arrays very efficiently, and manual tracking adds overhead.
- [PERF-361] Attempted to avoid `Promise.race` allocation in `SeekTimeDriver` injected script. DISCARDED because it was slower (48.761s vs 46.298s baseline). V8 handles the Promise.race array wrapper very efficiently, and the manual state machine added overhead.

## Open Questions
- [PERF-306] Attempted to disable renderer backgrounding (`--disable-renderer-backgrounding`, `--disable-backgrounding-occluded-windows`) to improve multi-worker actor model performance. DISCARDED. Resulted in significantly slower performance (42.335s vs ~32.1s baseline). Disabling backgrounding heuristics in the multi-process microVM environment appears to cause resource contention or CPU starvation rather than improving throughput.
- [PERF-474] Attempted to replace the async/await `runWorker` loop in `CaptureLoop.ts` with direct recursive Promise `.then()` chaining. DISCARDED because it resulted in a slower median render time (~2.565s vs baseline ~2.395s). The overhead from allocating many closure contexts for the `.then()` handlers outweighed any savings from bypassing the V8 async generator state machine.
- [PERF-840] Remove redundant checkState polling after awaiting drainPromise in the multi-worker loop to reduce CPU cycles in the hot path.

- **What Works:** PERF-904 removed `Math.min` from single-worker chunk traversal loops in `CaptureLoop.ts`.
  - **Improvement:** Reduced purely overhead function calls inside tight loops, replacing `Math.min` with direct boolean comparisons and assignments. This mirrors multi-worker chunk improvements and yields faster per-chunk dispatch time in tight V8 paths.
  - **Plan ID:** PERF-904
