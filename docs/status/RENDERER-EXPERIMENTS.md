## Performance Trajectory
Current best: 1.831s (baseline was 1.831s, -0%)
Last updated by: PERF-855

## What Works
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

## What Doesn't Work (and Why)
- PERF-858: Discarded as duplicate. The chunked loop approach in the multi-worker path was already successfully implemented and kept under PERF-859.
- PERF-849: Peeling the last frame iteration in the single-worker fast path frame loops to avoid `if (i < totalFrames - 1)` check actually increases execution time in V8 (likely due to deoptimization or code duplication). Discarded.
- Removing redundant aborted checks in single worker loop (slower by 0.00%) - PERF-848
- PERF-836: Unrolling the `nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth` check in the multi-worker CaptureLoop path. Microbenchmarks showed a ~14% performance degradation. This is likely due to the inner fast-loop increasing closure allocations or V8 engine failing to optimize the deeply nested structure properly, outweighing the minor savings from avoiding branch checks.
- PERF-800: Exponential Capacity Growth for Base64 Decode Buffer. Discarded as obsolete. The Base64 decode buffer reallocation logic has already been hoisted to CaptureLoop.ts, where it naturally uses 1.5x exponential growth.
- Tried to optimize Base64 buffer allocation in DomStrategy.ts (PERF-805), but the buffer allocation logic has been hoisted to CaptureLoop.ts and the optimization is already present. Discarded as obsolete.
- PERF-848: Hoist redundant `aborted` checks in single-worker fast loops (Plan created as unclaimed).
- PERF-846: Discarded as obsolete. Duplicate of PERF-848.

## Open Questions
- PERF-860 was discarded as the microbenchmarks showed that a chunked implementation with peeled final frame loop boundaries is slower than the fast counter. A new plan, PERF-861, was created to properly unbranch the inner loop by peeling the final frame entirely out of the while loop.


## What Works
- **What Works:** PERF-866 hoisted the `nextFrameToSubmit >= totalFrames` condition out of the inner multi-worker loops into the `while` loop continuation conditions in `CaptureLoop.ts`.
  - **Improvement:** Removed redundant branching on every multi-worker loop iteration, improving multi-worker microbenchmark loop execution by ~23% (from ~101.9ms to ~78.4ms for 10M iterations).
  - **Plan ID:** PERF-866
- Removed redundant aborted checks in chunked inner for loops to eliminate V8 branch evaluation overhead (PERF-862)
  - Plan ID: PERF-862
- Removed 8 redundant inner aborted checks in single-worker fast loop to eliminate V8 per-iteration branch evaluation overhead (~1.4% faster in microbenchmark) (PERF-848)

## What Doesn't Work (and Why)
- Overlapping FFmpeg stream write with Time Seek CDP await in the single-worker path (PERF-854). The Node.js stream write `stream.write` is extremely fast and mostly synchronous in its execution up until the OS buffer fills. Our test scripts and microbenchmarks show the overlapping actually caused a regression of ~1-3% because we delayed starting the CDP time seek command (`timeDriver.setTime`), which is network bound and takes significantly longer. Pushing the time seek *earlier* is more important than eagerly pushing the synchronous stream write, especially since `stream.write` isn't a long-running CPU bound task like Base64 decoding.

## Open Questions
- Would chunked loops benefit multi-worker paths as well? (PERF-856) -> Yes, PERF-859 planned.
- PERF-860: Single-worker chunked loops planned.
- PERF-862: Eliminate redundant aborted checks in chunked loop conditions planned.
- **What Works:** PERF-863 hoisted the `checkState()` call out of the inner multi-worker write loop in `CaptureLoop.ts`.
  - **Improvement:** Reduced synchronous function call overhead in the fast-path writer, improving microbenchmark loop execution time from ~9.6ms to ~3.0ms.
  - **Plan ID:** PERF-863
- PERF-864: Unroll frame ready check from multi-worker fast path write loops planned.
- **What Works:** PERF-864 unrolled the frame ready polling loop in the multi-worker fast paths of `CaptureLoop.ts`.
  - **Improvement:** Removed the nested `while` loop overhead from the fast path chunk traversal. If a frame is unready, it exits the inner fast chunk loop and awaits the frame normally in the outer loop scope. This decreases branch evaluations inside the fast chunk iterator.
  - **Plan ID:** PERF-864
- **What Doesn't Work (and Why):** PERF-865 attempted to implement a faster `ReusableThenable` in `CaptureLoop.ts` by reducing redundant V8 object property accesses. Microbenchmarks showed a ~5.4% regression in execution speed, likely due to V8's hidden class optimizations being disrupted. The change was discarded.
  - **Plan ID:** PERF-865
