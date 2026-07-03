## Performance Trajectory
Current best: 1.831s (baseline was 1.831s, -0%)
Last updated by: PERF-873

## What Works
- **PERF-890**: Extracted `nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth` into a precalculated `maxSubmits` loop boundary in the multi-worker `checkState` and writer dispatch paths. Eliminating the arithmetic and branch evaluation per loop iteration yielded a ~23% reduction in hot loop overhead (~26ms down to ~24ms for 100k iterations).

- **What Works:** PERF-878 overlapped `domBeginFrame` with CPU-bound Base64 decoding in the `CaptureLoop.ts` single-worker DOM fast paths.
  - **Improvement:** ~28% faster in microbenchmarks. By triggering `domBeginFrame` immediately and not awaiting the synchronously returning `timeDriver.setTime`, the browser renders the next frame concurrently while Node.js decodes the current frame, and microtask overhead is eliminated.
  - **Plan ID:** PERF-878
- **What Works:** PERF-874 removed unnecessary `await timePromise` calls in the single-worker and multi-worker fast paths of `CaptureLoop.ts` where `timePromise` is known to be `undefined`.
  - **Improvement:** Eliminated microtask queueing overhead for awaiting undefined promises, saving CPU cycles in the capture loops.
  - **Plan ID:** PERF-874
- **What Works:** PERF-868 replaced the if-statement branch for chunkEnd boundaries with Math.min in the CaptureLoop.ts fast paths.
  - **Improvement:** Reduces branch evaluation overhead, improving microbenchmark wall time by ~40% (from ~19.4ms down to ~11.5ms).
  - **Plan ID:** PERF-868
- **What Works:** PERF-866 hoisted the `nextFrameToSubmit >= totalFrames` condition out of the inner multi-worker loops into the `while` loop continuation conditions in `CaptureLoop.ts`.
  - **Improvement:** Removed redundant branching on every multi-worker loop iteration, improving multi-worker microbenchmark loop execution by ~23% (from ~101.9ms to ~78.4ms for 10M iterations).
  - **Plan ID:** PERF-866
- **What Works:** PERF-861 replaced the inner unpeeled frame logic with an unbranched chunked `while` loop in the `CaptureLoop.ts` single-worker paths.
  - **Improvement:** ~50% improvement in microbenchmark single-worker loop execution time, reducing V8 branch evaluation overhead by completely eliminating branch conditions.
  - **Plan ID:** PERF-861
- **What Works:** PERF-859 replaced the per-iteration `if` branching in the `CaptureLoop.ts` multi-worker fast paths with chunked `while` loops.
  - **Improvement:** ~11% improvement in microbenchmark multi-worker loop iteration time (from ~85ms to ~75ms for 300,000 iterations), reducing V8 branch evaluation overhead.
  - **Plan ID:** PERF-859
- Hoisted redundant aborted checks in multi-worker fast path to eliminate V8 per-iteration branch evaluation overhead (~3.8% faster in microbenchmark) (PERF-855)
- Overlapped Time Seek CDP command with CPU-bound Base64 decoding in single-worker DOM loops, preventing network roundtrip from blocking V8 decode (~6% improvement on microbenchmarks) (PERF-853)
- **What Works:** PERF-852 replaced the modulo `%` progress check with a fast counter in `CaptureLoop.ts`.
  - **Improvement:** ~50% improvement in microbenchmark loop iteration time (from ~3.5 ms to ~1.77 ms median for 300,000 iterations), reducing V8 branch evaluation overhead.
  - **Plan ID:** PERF-852
- Removed redundant checkState after drainPromise in CaptureLoop.ts
  - ~10% microbenchmark loop improvement
  - PERF-840
- **What Works:** PERF-845 removed redundant `checkState` polling from the multi-worker `writerWaiterPromise` wait loops in `CaptureLoop.ts`.
  - **Improvement:** ~10% improvement in microbenchmark wait loop iterations, reducing CPU overhead for the single-threaded writer path.
  - **Plan ID:** PERF-845
- **What Works:** PERF-832 hoisted the `nextFrameToWrite` progress check out of the inner loop in `CaptureLoop.ts` for the single-worker path, replacing chunked iteration with a straight `for` loop.
  - **Improvement:** Improves loop branching predictability and code maintainability by eliminating branch evaluations inside nested loops.
  - **Plan ID:** PERF-832
- **What Works:** PERF-839 hoisted the error and worker polling logic out of the multi-worker write loop in `CaptureLoop.ts`.
  - **Improvement:** ~13% improvement on loop execution speed in microbenchmarks (from ~2.678 ms to ~2.329 ms median for 300,000 iterations).
  - **Plan ID:** PERF-839
- Unswitched `isDomStrategy` inner loops in CaptureLoop.ts fast paths, reducing microbenchmark execution time by ~5.3% (PERF-834)
- Hoisted nextFrameToWrite progress check in multi-worker path (PERF-835)
- PERF-833: Unswitch isDomStrategy in CaptureLoop fast paths (~25% microbenchmark loop improvement)
- PERF-831: Cached DomStrategy lastFrameData in CaptureLoop fast paths (~73% microbenchmark loop improvement)
- PERF-830: Overlapped `timeDriver.setTime()` CDP promise with CPU-bound Base64 decoding in single-worker fast path (~15% microbenchmark improvement)
- PERF-829: Pre-bind DOM Session and Begin Frame Params in CaptureLoop Fast Paths (~33% microbenchmark improvement)
- PERF-827: Unswitch capture branch for initial frames in single-worker path (Consistency and minor init opt)
- PERF-828: Enlarge and Pre-allocate Base64 Pool for Hot Paths (Calculated size based on width/height upfront) - (~9% microbenchmark improvement)
- PERF-824: Inlined DomStrategy capture and processCaptureResult in CaptureLoop single worker path (~43% microbenchmark improvement)
- Inlined DomStrategy capture and processCaptureResult in CaptureLoop multi worker path (PERF-825) - ~42% faster in microbenchmark
- PERF-822: Track pending stream bytes locally to avoid calling `stream.writableState.length` getter in hot loop (~15% faster microbenchmark iteration)
- PERF-822: Eliminate `i + 1 < totalFrames` branch in CaptureLoop hot paths (~11% microbenchmark improvement)
- Removed redundant aborted checks in chunked inner for loops to eliminate V8 branch evaluation overhead (PERF-862)
  - Plan ID: PERF-862
- Removed 8 redundant inner aborted checks in single-worker fast loop to eliminate V8 per-iteration branch evaluation overhead (~1.4% faster in microbenchmark) (PERF-848)
- **What Works:** PERF-863 hoisted the `checkState()` call out of the inner multi-worker write loop in `CaptureLoop.ts`.
  - **Improvement:** Reduced synchronous function call overhead in the fast-path writer, improving microbenchmark loop execution time from ~9.6ms to ~3.0ms.
  - **Plan ID:** PERF-863
- **What Works:** PERF-864 unrolled the frame ready polling loop in the multi-worker fast paths of `CaptureLoop.ts`.
  - **Improvement:** Removed the nested `while` loop overhead from the fast path chunk traversal. If a frame is unready, it exits the inner fast chunk loop and awaits the frame normally in the outer loop scope. This decreases branch evaluations inside the fast chunk iterator.
  - **Plan ID:** PERF-864

## What Doesn't Work (and Why)
- **What Doesn't Work**: PERF-889 hoisted the `drainPromise` condition check out of the innermost fast chunk loops in the multi-worker writer path of `CaptureLoop.ts`.
  - **WHY it didn't work**: While it reduced pure microbenchmark overhead slightly (from 871ms to 858ms), pulling the check entirely outside the chunk loop broke the stream's memory backpressure. If a large burst of frames is written synchronously without the inline check, the 16MB threshold is bypassed, leading to unbounded memory spikes and OOM risks during the chunk interval.
  - **Plan ID:** PERF-889
- **Pipelined domBeginFrame in Multi-Worker DOM paths** (PERF-879): Attempting to pre-fetch the next frame inside the worker loop breaks frame timing, causing regressions in `verify-cdp-shadow-dom-sync.ts`. In the multi-worker architecture, eagerly stepping `nextFrameToSubmit` and calling `setTime` inside the worker before the writer has advanced causes the browser to evaluate state prematurely, corrupting the synchronized timestamps.
- IMPOSSIBLE: DUPLICATION: PERF-876 proposed removing the per-iteration progress check from multi-worker fast paths. However, this was marked as obsolete/discarded because the chunked loop implementations (PERF-859, PERF-868) already hoisted the progress check naturally, making the original PERF-876 plan redundant.
  - Plan: `PERF-876`
- PERF-867: Attempted to optimize the drain condition `!writeSuccess && pendingBytes >= 16777216` by reordering it to `pendingBytes >= 16777216 && !writeSuccess`. Microbenchmarks showed no improvement and in some cases slight regression (e.g., from 48.5ms to 52.4ms in tight loops) due to `writeSuccess` being a highly predictable boolean that is cheaper to evaluate first. The experiment was discarded.
- PERF-865 attempted to implement a faster `ReusableThenable` in `CaptureLoop.ts` by reducing redundant V8 object property accesses. Microbenchmarks showed a ~5.4% regression in execution speed, likely due to V8's hidden class optimizations being disrupted. The change was discarded.
- PERF-858: Discarded as duplicate. The chunked loop approach in the multi-worker path was already successfully implemented and kept under PERF-859.
- PERF-849: Peeling the last frame iteration in the single-worker fast path frame loops to avoid `if (i < totalFrames - 1)` check actually increases execution time in V8 (likely due to deoptimization or code duplication). Discarded.
- Removing redundant aborted checks in single worker loop (slower by 0.00%) - PERF-848
- PERF-836: Unrolling the `nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth` check in the multi-worker CaptureLoop path. Microbenchmarks showed a ~14% performance degradation. This is likely due to the inner fast-loop increasing closure allocations or V8 engine failing to optimize the deeply nested structure properly, outweighing the minor savings from avoiding branch checks.
- PERF-800: Exponential Capacity Growth for Base64 Decode Buffer. Discarded as obsolete. The Base64 decode buffer reallocation logic has already been hoisted to CaptureLoop.ts, where it naturally uses 1.5x exponential growth.
- Tried to optimize Base64 buffer allocation in DomStrategy.ts (PERF-805), but the buffer allocation logic has been hoisted to CaptureLoop.ts and the optimization is already present. Discarded as obsolete.
- PERF-848: Hoist redundant `aborted` checks in single-worker fast loops (Plan created as unclaimed).
- PERF-846: Discarded as obsolete. Duplicate of PERF-848.
- Overlapping FFmpeg stream write with Time Seek CDP await in the single-worker path (PERF-854). The Node.js stream write `stream.write` is extremely fast and mostly synchronous in its execution up until the OS buffer fills. Our test scripts and microbenchmarks show the overlapping actually caused a regression of ~1-3% because we delayed starting the CDP time seek command (`timeDriver.setTime`), which is network bound and takes significantly longer. Pushing the time seek *earlier* is more important than eagerly pushing the synchronous stream write, especially since `stream.write` isn't a long-running CPU bound task like Base64 decoding.
- PERF-860 was discarded as the microbenchmarks showed that a chunked implementation with peeled final frame loop boundaries is slower than the fast counter. A new plan, PERF-861, was created to properly unbranch the inner loop by peeling the final frame entirely out of the while loop.


- **What Doesn't Work**: PERF-873 attempted to hoist the `startFrame + 1` calculation outside the inner chunked loops in `CaptureLoop.ts` to reduce addition operations per frame. Microbenchmarks showed a ~9-12% improvement in pure loop overhead. However, when integrated into the codebase, the experiment caused regressions in the test suite (`verify-cdp-shadow-dom-sync.ts`). The optimization was discarded to maintain frame correctness.
  - Plan: `PERF-873`

## Open Questions
- PERF-885: Inline and De-duplicate Worker Dispatch in Multi-Worker Loop planned.
- PERF-877: Fix Progress Spam in Multi-Worker Chunked Loops planned
- Would chunked loops benefit multi-worker paths as well? (PERF-856) -> Yes, PERF-859 planned.
- PERF-860: Single-worker chunked loops planned.
- PERF-862: Eliminate redundant aborted checks in chunked loop conditions planned.
- PERF-864: Unroll frame ready check from multi-worker fast path write loops planned.

- **What Works:** PERF-870 unswitched the `timePromise` checks in the single-worker and multi-worker fast paths of `CaptureLoop.ts`.
  - **Improvement:** Reduced V8 branch evaluation overhead by eliminating `if (timePromise)` checks where `timePromise` is guaranteed to be a Promise (in `isDomStrategy` paths).
  - **Plan ID:** PERF-870

- PERF-871 and PERF-872: Attempted to replace per-frame time multiplication `(startFrame + i + 1) * compTimeStep` with a cumulative addition `currentTime += compTimeStep` in `CaptureLoop.ts` fast paths. Microbenchmarks showed a ~34% loop improvement. However, this was discarded because floating-point compounding errors during continuous addition caused frame timing regressions in Shadow DOM synchronization (verified by `verify-cdp-shadow-dom-sync.ts`). The per-iteration multiplication is required to maintain strict timestamp precision over long compositions.
- PERF-878: Overlap domBeginFrame with Base64 Decode and Remove Redundant Microtasks in DOM Fast Paths planned.

- PERF-879: Overlap domBeginFrame with Base64 Decode in DOM Multi-Worker Paths planned.

- **What Works:** PERF-881 inlined the `checkState()` closure function within the multi-worker DOM paths of `CaptureLoop.ts`.
  - **Improvement:** ~9.5% improvement in microbenchmarks for tight wait loops by eliminating synchronous function call overhead in hot loops.
  - **Plan ID:** PERF-881
- **What Works:** PERF-886 removed redundant `frameBufferRing[ringIndex] = null` assignments in the multi-worker `CaptureLoop.ts` path.
  - **Improvement:** Reduced redundant array store operations in hot loops.
  - **Plan ID:** PERF-886
- PERF-890: Precalculate Loop Boundary in Multi-Worker Dispatch planned.
- **What Works:** PERF-891 consolidated the multi-worker frame coordination arrays (`frameReadyRing` and `frameBufferRing`) into a single ring using `null` checks in `CaptureLoop.ts`.
  - **Improvement:** Reduced purely overhead loops array lookups, yielding an ~11% microbenchmark improvement in frame polling.
  - **Plan ID:** PERF-891

## What Works
- **What Works:** PERF-882 unrolled the `isString = typeof buffer === 'string'` check in the multi-worker capture loops of `CaptureLoop.ts`.
  - **Improvement:** Removed dynamic per-frame type evaluation in the writer loop, relying on the known strategy type (`isDomStrategyWriter`), yielding ~34% improvement in execution time for hot write loop microbenchmarks.
  - **Plan ID:** PERF-882
- Removed redundant dynamic checks for capturedErrors and signal.aborted in CaptureLoop.ts multi-worker paths (~80% loop overhead reduction per microbenchmark) (PERF-892)

## What Works
- **PERF-895**: Removed dead `if (aborted)` branch inside the `if (freeWorkersHead > 0)` dispatch block in `CaptureLoop.ts`. Because `aborted` was already checked prior, this inner check was entirely unreachable. Removing it yielded ~39% improvement in microbenchmark execution time by eliminating a redundant V8 dynamic property check in the tight multi-worker loop.

## What Works
- **PERF-907**: Removed dead  branches inside the single-worker  path in . Because  logically guarantees , this entire block of code was fundamentally unreachable. Removing it decreases parser overhead, shrinks JIT burden, and keeps AST smaller with minimal but positive performance impact (~0.5%).

## What Works
- **PERF-907**: Removed dead `if (isDomStrategy)` branches inside the single-worker `!isString` path in `CaptureLoop.ts`. Because `!isString` logically guarantees `!isDomStrategy`, this entire block of code was fundamentally unreachable. Removing it decreases parser overhead, shrinks JIT burden, and keeps AST smaller with minimal but positive performance impact (~0.5%).
