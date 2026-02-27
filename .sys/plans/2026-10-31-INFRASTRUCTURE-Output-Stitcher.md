# 2026-10-31-INFRASTRUCTURE-Output-Stitcher.md

## 1. Context & Goal
- **Objective**: Implement `FfmpegStitcher` to concatenate video segments without re-encoding using the concat demuxer.
- **Trigger**: Distributed rendering requires stitching multiple worker outputs (segments) into a final MP4.
- **Impact**: Enables the "Map-Reduce" pattern for distributed rendering where N workers produce N segments, and 1 stitcher combines them cheaply.

## 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/stitcher/ffmpeg-stitcher.ts`
  - `packages/infrastructure/tests/stitcher.test.ts`
- **Modify**:
  - `packages/infrastructure/src/stitcher/index.ts` (export stitcher)
  - `packages/infrastructure/src/index.ts` (export stitcher module)
- **Read-Only**:
  - `packages/infrastructure/src/adapters/local-adapter.ts` (reference implementation pattern)

## 3. Implementation Spec
- **Architecture**:
  - `VideoStitcher` interface: `stitch(segments: string[], outputPath: string): Promise<void>`
  - `FfmpegStitcher` implementation:
    - Generates a temporary `concat.txt` file listing all segments.
    - Runs `ffmpeg -f concat -safe 0 -i concat.txt -c copy output.mp4`
    - Uses `LocalWorkerAdapter` or `child_process` to execute ffmpeg.
- **Pseudo-Code**:
  ```typescript
  interface VideoStitcher {
    stitch(inputs: string[], output: string): Promise<void>;
  }

  class FfmpegStitcher implements VideoStitcher {
    async stitch(inputs, output) {
      // 1. Create temporary list file
      const listContent = inputs.map(f => `file '${resolve(f)}'`).join('\n');
      const listPath = writeTempFile(listContent);

      // 2. Run ffmpeg concat
      // ffmpeg -f concat -safe 0 -i listPath -c copy output

      // 3. Cleanup listPath
    }
  }
  ```
- **Dependencies**: Requires `ffmpeg` to be available in the environment (standard for Helios).

## 4. Test Plan
- **Verification**: `cd packages/infrastructure && npx vitest`
- **Success Criteria**:
  - Test creates dummy MP4s (or mocks ffmpeg calls).
  - Stitcher generates correct `concat.txt` format.
  - Stitcher executes ffmpeg command correctly.
- **Edge Cases**:
  - Missing input files.
  - Path with spaces.
  - Ffmpeg failure.
