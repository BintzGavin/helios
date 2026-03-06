#### 1. Context & Goal
- **Objective**: Implement performance benchmarks for the `FfmpegStitcher` video stitching component.
- **Trigger**: `AGENTS.md` permits "Benchmarks (only if performance is a selling point)" as a fallback action when a domain is aligned with the V2 vision, which the `INFRASTRUCTURE` domain currently is. Output stitching without re-encoding is a critical performance selling point for distributed rendering.
- **Impact**: Establishes performance baselines for concatenating video segments without re-encoding, verifying that `FfmpegStitcher`'s stream copying overhead remains minimal and scales linearly.

#### 2. File Inventory
- **Create**: `packages/infrastructure/tests/benchmarks/ffmpeg-stitcher.bench.ts` (Vitest benchmark suite for `FfmpegStitcher`)
- **Modify**: None
- **Read-Only**: `packages/infrastructure/src/stitcher/ffmpeg-stitcher.ts` (To understand options and execution logic), `packages/infrastructure/src/adapters/local-adapter.ts` (For mocking `WorkerAdapter`)

#### 3. Implementation Spec
- **Architecture**: Create a Vitest bench suite that tests the command generation, list writing, and process execution overhead of `FfmpegStitcher`.
- **Pseudo-Code**:
  - Mock a simple `WorkerAdapter` that intercepts the `execute` call and resolves immediately with `{ exitCode: 0, stdout: '', stderr: '', durationMs: 1 }` to isolate `FfmpegStitcher`'s Node.js overhead from actual `ffmpeg` disk I/O.
  - Instantiate `FfmpegStitcher` with the mocked adapter.
  - Define benchmark scenarios (`bench()`):
    - "Stitch 2 segments": Call `stitch(['part1.mp4', 'part2.mp4'], 'output.mp4')`.
    - "Stitch 10 segments": Call `stitch(10 segments, 'output.mp4')`.
    - "Stitch 100 segments": Call `stitch(100 segments, 'output.mp4')`.
  - Use `beforeAll` and `afterAll` blocks for any generic setup or teardown. The benchmark will test the time it takes to generate the concat list file, write it to disk (in `tmpdir()`), invoke the adapter, and clean up the list file.
- **Public API Changes**: None
- **Dependencies**: The `vitest` dependency and test infrastructure must be properly configured (already available).
- **Cloud Considerations**: This benchmark isolates the orchestrator logic itself, measuring the node.js file I/O for creating the concat list file and executing the adapter.

#### 4. Test Plan
- **Verification**: Run `npm run bench -w packages/infrastructure -- tests/benchmarks/ffmpeg-stitcher.bench.ts --run`
- **Success Criteria**: The command must successfully execute without crashing, and display Vitest benchmark statistics (ops/sec or latency) for each segment stitching scenario.
- **Edge Cases**: Ensure the temporary concat lists created in `tmpdir()` are reliably unlinked during the bench loop.
- **Integration Verification**: Not applicable; this is an isolated performance test.
