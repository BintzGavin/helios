## Performance Trajectory
Current best: 1.831s (baseline was 1.831s, -0%)
Last updated by: PERF-832

## What Works
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
- PERF-836: Unrolling the `nextFrameToSubmit - nextFrameToWrite < maxPipelineDepth` check in the multi-worker CaptureLoop path. Microbenchmarks showed a ~14% performance degradation. This is likely due to the inner fast-loop increasing closure allocations or V8 engine failing to optimize the deeply nested structure properly, outweighing the minor savings from avoiding branch checks.
- PERF-800: Exponential Capacity Growth for Base64 Decode Buffer. Discarded as obsolete. The Base64 decode buffer reallocation logic has already been hoisted to CaptureLoop.ts, where it naturally uses 1.5x exponential growth.
- Tried to optimize Base64 buffer allocation in DomStrategy.ts (PERF-805), but the buffer allocation logic has been hoisted to CaptureLoop.ts and the optimization is already present. Discarded as obsolete.

## Open Questions
