# Plan: Fix Audio Duration Handling in Renderer

## 1. Context & Goal
- **Objective**: Ensure the output video duration strictly matches `durationInSeconds`, preventing it from being cut short if the audio file is shorter than the video.
- **Trigger**: The current implementation uses `-shortest`, which causes the video to end prematurely if the audio track is shorter than the animation duration.
- **Impact**: Guarantees that the generated video is exactly the requested length, regardless of audio length (audio will stop/silence if shorter).

## 2. File Inventory
- **Modify**:
  - `packages/renderer/src/strategies/DomStrategy.ts`: Replace `-shortest` with `-t duration`.
  - `packages/renderer/src/strategies/CanvasStrategy.ts`: Replace `-shortest` with `-t duration`.
- **Read-Only**:
  - `packages/renderer/src/types.ts`

## 3. Implementation Spec
- **Architecture**:
  - The `RendererOptions` already contains `durationInSeconds`.
  - In `getFFmpegArgs`, instead of adding `-shortest`, we will add `-t <durationInSeconds>`.
  - This ensures FFmpeg writes exactly that many seconds of output.

- **Pseudo-Code**:
  ```typescript
  // In strategies
  const duration = options.durationInSeconds.toString();
  const audioOutputArgs = options.audioFilePath
    ? ['-c:a', 'aac', '-map', '0:v', '-map', '1:a', '-t', duration]
    : [];
  ```

- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  - Update `packages/renderer/scripts/verify-audio-args.ts` to assert that `-t` is present and `-shortest` is absent when audio is used.
  - Run `npx ts-node packages/renderer/scripts/verify-audio-args.ts`.
- **Success Criteria**:
  - Verification script passes.
  - Arguments list contains `-t` and correct duration value.
  - Arguments list does *not* contain `-shortest`.
