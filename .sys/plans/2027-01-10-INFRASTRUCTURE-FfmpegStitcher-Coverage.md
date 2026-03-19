#### 1. Context & Goal
- **Objective**: Expand test coverage for `FfmpegStitcher` to 100%.
- **Trigger**: Running `vitest run --coverage` and reviewing the HTML report revealed that test coverage for `FfmpegStitcher` is currently at 83.33% because the default instantiation case without providing an adapter (`this.adapter = adapter || new LocalWorkerAdapter();`) is not covered.
- **Impact**: Attaining 100% test coverage for `FfmpegStitcher` enhances reliability and closes out remaining missing branch coverage gaps in the `stitcher` directory.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/tests/stitcher.test.ts`
- **Read-Only**: `packages/infrastructure/src/stitcher/ffmpeg-stitcher.ts`

#### 3. Implementation Spec
- **Architecture**: We will add an additional unit test inside the existing `describe` block in the test file.
- **Pseudo-Code**:
  ```typescript
  it('should use LocalWorkerAdapter by default if no adapter is provided', () => {
    const defaultStitcher = new FfmpegStitcher();
    expect(defaultStitcher['adapter']).toBeDefined();
    expect(defaultStitcher['adapter'].constructor.name).toBe('LocalWorkerAdapter');
  });
  ```
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: None

#### 4. Test Plan
- **Verification**: Run `cd packages/infrastructure && npx vitest run tests/stitcher.test.ts --coverage`
- **Success Criteria**: The coverage for `src/stitcher/ffmpeg-stitcher.ts` reaches 100% for lines, statements, branches, and functions.
- **Edge Cases**: None
- **Integration Verification**: None
