# 1. Context & Goal
- **Objective**: Enable configurable video codecs and pixel formats in `RendererOptions` and eliminate duplicated FFmpeg argument logic across strategies.
- **Trigger**: The current implementation hardcodes `libx264` and `yuv420p`, preventing transparency support (e.g., WebM/VP9) and limiting format choices.
- **Impact**: Unlocks transparent video export, custom bitrate/quality control, and simplifies maintenance by centralizing FFmpeg logic.

# 2. File Inventory
- **Create**:
  - `packages/renderer/src/strategies/ffmpeg-utils.ts`: Utility for generating common FFmpeg arguments.
  - `packages/renderer/scripts/verify-codec-config.ts`: Verification script to test codec configuration.
- **Modify**:
  - `packages/renderer/src/types.ts`: Add `videoCodec`, `pixelFormat`, `audioCodec`, `outputFormat` to `RendererOptions`.
  - `packages/renderer/src/strategies/CanvasStrategy.ts`: Use `ffmpeg-utils` helper.
  - `packages/renderer/src/strategies/DomStrategy.ts`: Use `ffmpeg-utils` helper.
- **Read-Only**:
  - `packages/renderer/src/strategies/RenderStrategy.ts`

# 3. Implementation Spec
- **Architecture**: Extract common FFmpeg argument generation (audio input, audio/video output) into a shared utility function `getCommonFFmpegArgs` in `ffmpeg-utils.ts`. Strategies will invoke this helper, passing their specific `videoInputArgs`.
- **Public API Changes**:
  - `RendererOptions` interface in `types.ts` will add:
    - `videoCodec?: string`: Default `'libx264'`.
    - `pixelFormat?: string`: Default `'yuv420p'`.
    - `audioCodec?: string`: Default `'aac'`.
    - `outputFormat?: string`: Optional explicit container format (e.g., `'mp4'`, `'webm'`).
- **Pseudo-Code**:
  ```typescript
  // packages/renderer/src/strategies/ffmpeg-utils.ts

  export function getCommonFFmpegArgs(
    options: RendererOptions,
    videoInputArgs: string[],
    outputPath: string
  ): string[] {
    // CALCULATE audioInputArgs based on options.audioFilePath and options.startFrame
    // IF audioFilePath exists:
    //   CALCULATE audioOutputArgs using options.audioCodec (default 'aac') and duration
    // ELSE:
    //   SET audioOutputArgs to empty

    // CALCULATE outputArgs:
    //   -c:v options.videoCodec OR 'libx264'
    //   -pix_fmt options.pixelFormat OR 'yuv420p'
    //   -movflags +faststart (if format is compatible, or always)
    //   INCLUDE audioOutputArgs
    //   outputPath

    // RETURN ['-y', ...videoInputArgs, ...audioInputArgs, ...outputArgs]
  }
  ```

- **Dependencies**: None.

# 4. Test Plan
- **Verification**: Run the verification script and build the package.
  `npx ts-node packages/renderer/scripts/verify-codec-config.ts && npm run build`
- **Success Criteria**:
  - `verify-codec-config.ts` runs without errors and confirms that `DomStrategy` and `CanvasStrategy` generate correct FFmpeg arguments when custom codecs are provided (e.g., `videoCodec: 'libvpx-vp9'`).
  - `npm run build` completes successfully, ensuring type safety.
  - Default options still produce `libx264` and `yuv420p`.
- **Pre-Commit**: Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
