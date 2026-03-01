#### 1. Context & Goal
- **Objective**: Implement automated verification tests for deterministic frame seeking across cloud worker adapters.
- **Trigger**: The V2 vision mandates distributed rendering suitable for cloud execution with "Deterministic frame seeking". While core drivers support this, infrastructure lacks automated verification to ensure cloud adapters (AWS Lambda, Cloud Run) return byte-identical frames for identical inputs regardless of execution order.
- **Impact**: Guarantees that distributed chunks rendered on ephemeral cloud workers can be flawlessly stitched together without jitter or artifacts caused by non-deterministic rendering state.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/tests/e2e/deterministic-seeking.test.ts`
- **Modify**:
  - `packages/infrastructure/package.json` (if needed for test script)
- **Read-Only**:
  - `packages/infrastructure/src/adapters/aws-adapter.ts`
  - `packages/infrastructure/src/adapters/cloudrun-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Create an integration test that uses the local adapter to render a complex animation chunk (e.g., frames 50-60) twice, in separate sterile contexts, and asserts that the resulting output files (or frame hashes) are strictly identical.
- **Pseudo-Code**:
  ```typescript
  // Pseudocode for test structure
  it('should produce identical chunk outputs when rendered in isolation', async () => {
    const executor = new JobExecutor(new LocalWorkerAdapter());

    // Render chunk A
    await executor.execute(spec, { jobDir: tempDirA });
    const hashA = await calculateHash(tempDirA + '/chunk_50_60.mp4');

    // Render chunk B (exact same spec)
    await executor.execute(spec, { jobDir: tempDirB });
    const hashB = await calculateHash(tempDirB + '/chunk_50_60.mp4');

    expect(hashA).toEqual(hashB);
  });
  ```
- **Public API Changes**: None. Internal testing infrastructure only.
- **Dependencies**: Requires a deterministically renderable sample job spec (e.g., an existing demo).
- **Cloud Considerations**: This test validates the foundational assumption that stateless cloud execution is viable for video rendering without prior frame context.

#### 4. Test Plan
- **Verification**: Run `cd packages/infrastructure && npm run test` to verify the new test runs and passes.
- **Success Criteria**: The test successfully renders the same chunk multiple times and programmatically verifies the outputs are identical byte-for-byte or via visual hash.
- **Edge Cases**: Animations relying on random numbers (should fail unless seeded), floating point inaccuracies across architectures.
- **Integration Verification**: Ensure the test runner correctly spawns the `LocalWorkerAdapter` and compares the outputs.