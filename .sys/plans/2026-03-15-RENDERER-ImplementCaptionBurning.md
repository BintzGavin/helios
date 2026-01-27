# 2026-03-15 - Implement Caption Burning Support

## 1. Context & Goal
- **Objective**: Add support for burning SRT captions into rendered videos via FFmpeg's `subtitles` filter.
- **Trigger**: Vision Gap - Roadmap calls for "Caption export (burned-in)" in V1.x.
- **Impact**: Enables users to include subtitles in their programmatic videos, a key feature for social media content.

## 2. File Inventory
- **Create**:
  - `packages/renderer/scripts/verify-captions.ts`: Verification script that generates a dummy SRT and renders a video with captions.
- **Modify**:
  - `packages/renderer/src/types.ts`: Add `captionFilePath` to `RendererOptions`.
  - `packages/renderer/src/utils/FFmpegBuilder.ts`: Update `getArgs` to apply the `subtitles` video filter.
- **Read-Only**:
  - `packages/renderer/src/index.ts`
  - `packages/renderer/src/strategies/RenderStrategy.ts`

## 3. Implementation Spec
- **Architecture**:
  - Update `FFmpegBuilder` to conditionally inject the `-vf subtitles='path'` argument into the FFmpeg command construction.
  - Ensure compatibility by sanitizing the file path (escaping Windows drive letters/backslashes) for the filter string.
  - Validation: Throw an error if `captionFilePath` is used with `videoCodec: 'copy'`, as burning requires re-encoding.
- **Pseudo-Code**:
  ```typescript
  // packages/renderer/src/utils/FFmpegBuilder.ts

  // HELPER: escapeFilterPath(path: string): string
  //   Replace \ with /
  //   Replace : with \: (if it's a drive letter or special char)
  //   Replace ' with \'
  //   RETURN sanitizedPath

  // In getArgs:
  IF options.captionFilePath IS DEFINED THEN
    IF videoCodec IS 'copy' THEN
       THROW Error("Caption burning requires re-encoding. videoCodec cannot be 'copy'.")
    END IF

    SET sanitizedPath = escapeFilterPath(options.captionFilePath)
    ADD '-vf', `subtitles='${sanitizedPath}'` TO encodingArgs
  END IF
  ```
- **Public API Changes**:
  - `RendererOptions` gains optional `captionFilePath: string` property.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npx ts-node packages/renderer/scripts/verify-captions.ts`
- **Success Criteria**:
  - The script runs without error.
  - The output video is generated at `output-verify-captions/output.mp4`.
  - FFmpeg log (stderr) shows `subtitles='...'` argument.
- **Edge Cases**:
  - Path with spaces.
  - Windows paths (backslashes, drive letters).
  - Attempting to use `videoCodec: 'copy'` (should throw).

## 5. Final Steps
- Complete pre commit steps to ensure proper testing, verification, review, and reflection are done.
