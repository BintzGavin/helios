# 2026-03-09-RENDERER-Audio-Mixing

#### 1. Context & Goal
- **Objective**: Implement support for multiple audio tracks in `Renderer` and refactor duplicated FFmpeg argument generation logic.
- **Trigger**: Vision Gap - "Advanced audio mixing" (README) is missing; currently only one `audioFilePath` is supported. Also, identical FFmpeg argument logic exists in `CanvasStrategy` and `DomStrategy`.
- **Impact**: Enables users to mix background music with voiceovers (critical for video generation). Improves maintainability by centralizing FFmpeg configuration.

#### 2. File Inventory
- **Create**:
  - `packages/renderer/src/utils/FFmpegBuilder.ts`: Shared utility for constructing FFmpeg arguments.
  - `packages/renderer/scripts/verify-audio-mixing.ts`: Verification script for multi-track audio.
- **Modify**:
  - `packages/renderer/src/types.ts`: Add `audioTracks` to `RendererOptions`.
  - `packages/renderer/src/strategies/CanvasStrategy.ts`: Use `FFmpegBuilder`.
  - `packages/renderer/src/strategies/DomStrategy.ts`: Use `FFmpegBuilder`.
- **Read-Only**:
  - `packages/renderer/src/index.ts`
  - `README.md`

#### 3. Implementation Spec

**Architecture:**
- Extract FFmpeg command construction into a `FFmpegBuilder` class (Builder Pattern / Helper).
- `FFmpegBuilder` accepts `RendererOptions` and `outputPath`.
- It handles:
  - Video Input (IVF pipe vs Image2Pipe).
  - Audio Inputs (Single `audioFilePath` vs Multiple `audioTracks`).
  - Filters (Complex `amix` if multiple audio tracks).
  - Output Codecs and Flags (`videoCodec`, `pixelFormat`, `crf`, etc.).
- Update `CanvasStrategy` and `DomStrategy` to delegate to `FFmpegBuilder.getArgs()`.

**Pseudo-Code (`packages/renderer/src/utils/FFmpegBuilder.ts`):**
```typescript
class FFmpegBuilder {
  getArgs(options, outputPath, videoInputArgs) {
    SET args = ['-y']
    ADD videoInputArgs to args

    // Audio Inputs
    SET inputs = options.audioTracks OR (options.audioFilePath ? [options.audioFilePath] : [])

    FOR EACH input IN inputs:
      IF options.startFrame > 0:
        ADD ['-ss', startTime]
      ADD ['-i', input]

    // Filters
    IF inputs.length > 1:
      ADD ['-filter_complex', `amix=inputs=${inputs.length}:duration=longest`]
      MAP filter output to audio stream
    ELSE IF inputs.length == 1:
      MAP input 1:a to audio stream

    // Video Encoding
    ADD ['-c:v', options.videoCodec || 'libx264']
    ADD ['-pix_fmt', options.pixelFormat || 'yuv420p']
    // ... add CRF, Preset, Bitrate ...

    // Audio Encoding
    IF has audio:
      ADD ['-c:a', 'aac']
      ADD ['-t', options.durationInSeconds]

    ADD outputPath
    RETURN args
  }
}
```

**Public API Changes:**
- `RendererOptions` in `packages/renderer/src/types.ts`:
  - Add `audioTracks?: string[]` (optional array of file paths).

**Dependencies:**
- None.

#### 4. Test Plan
- **Verification**: `npx ts-node packages/renderer/scripts/verify-audio-mixing.ts`
- **Success Criteria**:
  - Render completes without error.
  - Output video contains audio stream.
  - `ffprobe` confirms audio duration matches video duration.
  - (Manual) Output video plays mixed audio.
- **Edge Cases**:
  - `audioTracks` empty.
  - `audioTracks` has 1 file (should behave like `audioFilePath`).
  - `audioTracks` mixed with `audioFilePath` (preference to `audioTracks` or merge? Spec: `audioTracks` takes precedence, or merge if both present. Simplest: Use `audioTracks` if present, else `audioFilePath`).
