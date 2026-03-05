#### 1. Context & Goal
- **Objective**: Create an example script demonstrating the use of `FfmpegStitcher` and document the Video Stitching abstractions in the `README.md`.
- **Trigger**: The INFRASTRUCTURE domain is aligned with the V2 vision, so we are executing the Documentation clarity and Examples fallback actions.
- **Impact**: Improves knowledge management and provides a concrete example for developers to understand how output stitching works without re-encoding.

#### 2. File Inventory
- **Create**: `packages/infrastructure/examples/ffmpeg-stitcher.ts` (Example script demonstrating `FfmpegStitcher`)
- **Modify**: `packages/infrastructure/README.md` (Add documentation for Video Stitching and `FfmpegStitcher`)
- **Read-Only**: `packages/infrastructure/src/stitcher/ffmpeg-stitcher.ts` (To understand the API for the example and documentation)

#### 3. Implementation Spec
- **Architecture**: Provide an executable TypeScript example that generates dummy video chunks and uses `FfmpegStitcher` to concatenate them without re-encoding using the `concat` demuxer.
- **Pseudo-Code**:
  - In `ffmpeg-stitcher.ts` example:
    - Create a temporary directory.
    - Generate 2-3 short dummy video files using a `LocalWorkerAdapter` executing `ffmpeg`.
    - Instantiate `FfmpegStitcher`.
    - Call `stitch(inputs, output)` with the generated files.
    - Assert the output file exists and log success.
    - Clean up temporary files.
  - In `README.md`:
    - Add a `### Video Stitching` section under `## Features`.
    - Document the `VideoStitcher` interface and `FfmpegStitcher` implementation.
    - Explain that it uses the `concat` demuxer to avoid re-encoding for fast merging of distributed rendering chunks.
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: The example will run locally but demonstrates the final step of a distributed cloud rendering pipeline.

#### 4. Test Plan
- **Verification**: Run `npm install` and `npx tsx packages/infrastructure/examples/ffmpeg-stitcher.ts`.
- **Success Criteria**: The example script executes successfully, outputs logs indicating the successful stitching of dummy videos, and exits with code 0. The `README.md` contains the new documentation section.
- **Edge Cases**: Ensure the example script cleans up its temporary files even if an error occurs.
- **Integration Verification**: Ensure no existing tests or builds break (`npm test -w packages/infrastructure` and `npm run lint -w packages/infrastructure`).
