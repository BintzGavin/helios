#### 1. Context & Goal
- **Objective**: Implement performance benchmarks for the `FfmpegStitcher` to measure video chunk merging performance.
- **Trigger**: The Infrastructure domain is currently in gravitational equilibrium with V2 requirements. Therefore, I am focusing on the allowed fallback action of adding performance Benchmarks.
- **Impact**: Provides measurable performance metrics for video stitching, enabling future optimizations and ensuring fast merge times for distributed rendering workflows.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/tests/benchmarks/ffmpeg-stitcher.bench.ts`: Performance benchmarks for `FfmpegStitcher`.
- **Modify**: None.
- **Read-Only**:
  - `packages/infrastructure/src/worker/ffmpeg-stitcher.ts`: The stitcher implementation to benchmark.

#### 3. Implementation Spec
- **Architecture**: Use `vitest bench` to evaluate the time it takes for `FfmpegStitcher` to concatenate video chunks.
- **Pseudo-Code**:
  - In a `beforeAll` hook, create dummy `.mp4` video chunks using a child process executing `ffmpeg` (e.g., generating black video frames or solid colors for a few seconds each) to simulate rendered segments. Ensure output directories are created.
  - Define `bench()` test cases to stitch these dummy chunks together using `FfmpegStitcher`.
  - In an `afterAll` hook, clean up the generated dummy video chunks and the stitched output video file to prevent disk bloat.
  - *Note*: Ensure no heavy setup/teardown logic exists inside the `bench()` configuration itself to avoid race conditions and FD leaks.
- **Public API Changes**: None.
- **Dependencies**: Requires `ffmpeg` to be installed in the execution environment.
- **Cloud Considerations**: Not directly applicable to the benchmark itself, but fast stitching is essential for the final merging step of cloud-executed chunks.

#### 4. Test Plan
- **Verification**: Run `npm run bench -w packages/infrastructure -- tests/benchmarks/ffmpeg-stitcher.bench.ts --run`
- **Success Criteria**: The benchmark executes successfully and outputs performance metrics (e.g., operations per second, latency) without any "missing directory" errors or file descriptor exhaustion.
- **Edge Cases**: Verify behavior when the output directory for the stitched file does not initially exist (the stitcher or setup should handle it).
- **Integration Verification**: Ensure the benchmark properly cleans up all temporary `.mp4` and `.txt` (concat list) files after execution.