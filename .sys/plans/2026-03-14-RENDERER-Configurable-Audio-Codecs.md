# 2026-03-14 - Configurable Audio Codecs

#### 1. Context & Goal
- **Objective**: Enable support for non-MP4 output formats (e.g., WebM) by adding `audioCodec` and `audioBitrate` options to `RendererOptions` and implementing smart defaults in `FFmpegBuilder`.
- **Trigger**: The Vision promises "Multiple formats - MP4, WebM", but the current `FFmpegBuilder` hardcodes audio to `aac`, making WebM output impossible (as it requires Vorbis/Opus).
- **Impact**: Unlocks native WebM rendering and allows users to control audio compression quality, closing a gap in the "Multiple Formats" vision.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/types.ts` (Add optional `audioCodec` and `audioBitrate` strings to `RendererOptions` interface)
- **Modify**: `packages/renderer/src/utils/FFmpegBuilder.ts` (Update `getArgs` to respect new options and infer defaults)
- **Create**: `packages/renderer/tests/verify-audio-codecs.ts` (New test script to verify flag generation)

#### 3. Implementation Spec
- **Architecture**: Extend `RendererOptions` to include audio configuration. Update `FFmpegBuilder` to conditionally select audio codecs. Use "Smart Defaults" pattern to infer `libvorbis` when `libvpx` is used for video, ensuring valid container formats by default.
- **Public API Changes**:
  - `RendererOptions`: Add `audioCodec?: string` (e.g., 'libvorbis', 'aac', 'libopus')
  - `RendererOptions`: Add `audioBitrate?: string` (e.g., '192k', '128k')

**Pseudo-Code (FFmpegBuilder.getArgs):**
```text
DEFINE method getArgs(options, outputPath, videoInputArgs):
  INIT tracks list from options.audioTracks OR options.audioFilePath

  // Calculate Audio Codec
  SET audioCodec = options.audioCodec

  IF audioCodec IS UNDEFINED:
    GET videoCodec from options.videoCodec (default 'libx264')
    IF videoCodec STARTS_WITH 'libvpx':
      SET audioCodec = 'libvorbis'
    ELSE:
      SET audioCodec = 'aac' (default)

  // Build Audio Output Args
  INIT audioOutputArgs list

  IF tracks has items:
    APPEND '-c:a', audioCodec to audioOutputArgs
    APPEND '-t', options.duration to audioOutputArgs

    IF options.audioBitrate IS DEFINED:
      APPEND '-b:a', options.audioBitrate to audioOutputArgs

    // ... existing mixing logic ...

  // ... existing video encoding logic ...

  RETURN combined arguments
```

#### 4. Test Plan
- **Verification**: `npx ts-node packages/renderer/tests/verify-audio-codecs.ts`
- **Success Criteria**:
  - Run the verification script which uses `FFmpegBuilder.getArgs` directly (unit test style) to assert output args.
  - Case 1: No options -> assert `-c:a aac` is present.
  - Case 2: `videoCodec: 'libvpx-vp9'` -> assert `-c:a libvorbis` is present.
  - Case 3: `audioCodec: 'libopus'` -> assert `-c:a libopus` is present.
  - Case 4: `audioBitrate: '128k'` -> assert `-b:a 128k` is present.
- **Edge Cases**:
  - `videoCodec: 'copy'` -> ensure it defaults to 'aac' (safe fallback) or respects explicit `audioCodec`.
