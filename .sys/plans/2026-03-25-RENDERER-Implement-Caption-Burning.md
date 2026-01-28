#### 1. Context & Goal
- **Objective**: Enable burning subtitles (SRT/VTT) into the rendered video by integrating FFmpeg's `subtitles` filter into the rendering pipeline.
- **Trigger**: Roadmap lists "Captions export (burned-in)" as Planned, and `docs/status/RENDERER.md` claims it's completed but the code is missing.
- **Impact**: Unlocks the ability for users to export videos with hard-coded subtitles, essential for accessibility and social media compliance.

#### 2. File Inventory
- **Create**:
  - `packages/renderer/tests/verify-subtitles.ts`: A verification script to ensure `Renderer` correctly validates options and generates the `subtitles` filter arg.
- **Modify**:
  - `packages/renderer/src/types.ts`: Add `subtitles` to `RendererOptions`.
  - `packages/renderer/src/utils/FFmpegBuilder.ts`: Implement logic to inject `-vf subtitles='...'`.
- **Read-Only**:
  - `packages/renderer/src/strategies/CanvasStrategy.ts`
  - `packages/renderer/src/strategies/DomStrategy.ts`

#### 3. Implementation Spec
- **Architecture**: Extend the existing `FFmpegBuilder` utility to conditionally append the `subtitles` video filter to the FFmpeg command chain. Use strict validation to prevent usage with stream-copy codecs.
- **Pseudo-Code**:
  ```typescript
  // packages/renderer/src/utils/FFmpegBuilder.ts

  // IN getArgs(options, ...):

  // VALIDATE compatibility
  IF options.subtitles defined AND options.videoCodec IS 'copy':
      THROW Error("Cannot burn subtitles with 'copy' codec")

  // APPEND filter if needed
  IF options.subtitles defined:
      RESOLVE absolute path of options.subtitles
      ESCAPE path for FFmpeg (replace backslashes, escape colons)
      APPEND "-vf", "subtitles='<escaped_path>'" TO args
  ```
- **Public API Changes**:
  - `RendererOptions` interface adds `subtitles?: string` (path to subtitle file).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx ts-node packages/renderer/tests/verify-subtitles.ts`
- **Success Criteria**:
  - Output contains "Correct subtitles filter: subtitles='...'"
  - Error thrown when `videoCodec: 'copy'` is used with subtitles.
- **Edge Cases**:
  - Windows file paths (backslashes) must be converted/escaped for FFmpeg filters.
  - Spaces in filenames must be handled by the single-quote wrapping.
