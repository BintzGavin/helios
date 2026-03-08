#### 1. Context & Goal
- **Objective**: Expand test coverage for `FfmpegStitcher` to include comprehensive resiliency and regression tests handling edge cases and execution errors.
- **Trigger**: The INFRASTRUCTURE domain has reached gravitational equilibrium, and `AGENTS.md` directs agents to perform fallback actions such as adding regression tests. While `FfmpegStitcher` has basic unit tests and benchmarks, it lacks robust resiliency coverage.
- **Impact**: Ensures that video stitching failures (e.g., worker adapter throwing unexpected errors during execution, or issues handling specific malformed inputs) are caught and handled gracefully during distributed execution without crashing the runtime.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/tests/stitcher-resiliency.test.ts`: A new test suite dedicated to FfmpegStitcher resiliency edge cases. (Alternatively, modify existing `packages/infrastructure/tests/stitcher.test.ts`)
- **Modify**:
  - `packages/infrastructure/tests/stitcher.test.ts`: Add comprehensive resiliency test cases simulating execution errors and environment failures.
- **Read-Only**:
  - `packages/infrastructure/src/stitcher/ffmpeg-stitcher.ts`: The implementation logic being tested.
  - `packages/infrastructure/src/types/adapter.ts`: The interface for WorkerAdapter.

#### 3. Implementation Spec
- **Architecture**:
  - Add test blocks within the `describe` block for `FfmpegStitcher` in `tests/stitcher.test.ts`.
  - Utilize `vitest` mocking to simulate `WorkerAdapter.execute` throwing an error instead of returning a failed `WorkerResult` (e.g., simulated process crash or network failure).
  - Add tests to ensure temporary `concat-*.txt` files are cleaned up correctly even if the initial `writeFile` operation hangs or throws an unexpected system error, or if `unlink` throws.
- **Pseudo-Code**:
  ```typescript
  it('should handle adapter throwing an unhandled exception gracefully', async () => {
    mockAdapter.execute = vi.fn().mockRejectedValue(new Error('Process crashed unexpectedly'));
    await expect(stitcher.stitch(['/path/1.mp4'], 'out.mp4')).rejects.toThrow('Process crashed unexpectedly');
    // Ensure cleanup is still attempted
    expect(fs.unlink).toHaveBeenCalled();
  });
  ```
- **Public API Changes**: None. This is exclusively a testing enhancement.
- **Dependencies**: None. Can be implemented independently.
- **Cloud Considerations**: Ensures that cloud environments with ephemeral or failing filesystems correctly handle errors during the stitching process without stranding temporary state.

#### 4. Test Plan
- **Verification**: Run the test suite: `cd packages/infrastructure && npm run test -- tests/stitcher.test.ts`
- **Success Criteria**: All new and existing `FfmpegStitcher` tests must pass. The test output must explicitly show that execution exceptions and file-system level errors are safely caught and bubbled up.
- **Edge Cases**:
  - Missing temporary directory permissions.
  - `WorkerAdapter.execute` completely rejecting.
  - Deletion `unlink` throwing a persistent error (e.g., `EACCES`), ensuring the `finally` block swallows it as expected without halting execution.
- **Integration Verification**: Not required. This focuses on unit-level component resiliency.