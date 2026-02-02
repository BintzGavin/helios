# RENDERER: Zero Disk I/O for Audio

## 1. Context & Goal
- **Objective**: Eliminate temporary file creation for Blob audio tracks by piping them directly to FFmpeg via additional stdio pipes.
- **Trigger**: The Vision ("Zero Disk I/O") is currently violated by `blob-extractor.ts` which writes `blob:` URL content to `os.tmpdir()`.
- **Impact**: Improves security, reliability, and architectural purity by keeping all data in memory/pipes.

## 2. File Inventory
- **Modify**:
  - `packages/renderer/src/types.ts`: Add `buffer?: Buffer` to `AudioTrackConfig`.
  - `packages/renderer/src/utils/blob-extractor.ts`: Refactor to return Buffers instead of paths.
  - `packages/renderer/src/utils/FFmpegBuilder.ts`: Update to map buffers to `pipe:N` inputs.
  - `packages/renderer/src/strategies/RenderStrategy.ts`: Update `getFFmpegArgs` return type.
  - `packages/renderer/src/strategies/DomStrategy.ts`: Update `prepare` and `getFFmpegArgs`.
  - `packages/renderer/src/strategies/CanvasStrategy.ts`: Update `prepare` and `getFFmpegArgs`.
  - `packages/renderer/src/index.ts`: Update `render` method to handle pipe spawning and writing.

## 3. Implementation Spec

### Architecture
- **Piped Inputs**: Instead of passing file paths to FFmpeg, we will pass `pipe:3`, `pipe:4`, etc.
- **Pipe Management**: The `Renderer` class will open these extra pipes when spawning FFmpeg and write the audio buffers to them immediately.
- **Config Flow**:
  1. `Strategies` extract blobs -> `AudioTrackConfig` with `buffer`.
  2. `FFmpegBuilder` sees `buffer` -> Assigns `pipe:N` to `path` property in args, collects `buffer` + `pipeIndex`.
  3. `Renderer` spawns FFmpeg with `stdio` array sized to accommodate extra pipes.
  4. `Renderer` writes buffers to pipes and closes them.

### Pseudo-Code

**types.ts**
```typescript
interface AudioTrackConfig {
  // ... existing fields
  buffer?: Buffer; // New field
}

interface FFmpegConfig {
  args: string[];
  inputBuffers: { index: number; buffer: Buffer }[];
}
```

**blob-extractor.ts**
```typescript
FUNCTION extractBlobTracks(page, tracks)
  updatedTracks = []
  FOR track IN tracks
    IF track.path startsWith 'blob:'
      base64 = FETCH from page
      buffer = Buffer.from(base64)
      updatedTracks.push({ ...track, buffer: buffer }) // No path change yet, or set path to 'blob-memory'
    ELSE
      updatedTracks.push(track)
  RETURN { tracks: updatedTracks, cleanup: NOOP }
```

**FFmpegBuilder.ts**
```typescript
FUNCTION getArgs(options, outputPath, videoInputArgs) -> FFmpegConfig
  nextPipeIndex = 3 // 0=stdin, 1=stdout, 2=stderr
  inputBuffers = []

  // Normalize tracks
  processedTracks = tracks.map(track => {
    IF track.buffer
      pipePath = `pipe:${nextPipeIndex}`
      inputBuffers.push({ index: nextPipeIndex, buffer: track.buffer })
      nextPipeIndex++
      RETURN { ...track, path: pipePath }
    ELSE
      RETURN track
  })

  // ... generate args using processedTracks (which now have pipe:N paths) ...

  RETURN { args, inputBuffers }
```

**RenderStrategy.ts**
```typescript
INTERFACE RenderStrategy
  // Change return type
  getFFmpegArgs(options, output): FFmpegConfig
```

**Renderer.ts (index.ts)**
```typescript
  // In render()
  ffmpegConfig = strategy.getFFmpegArgs(...)

  // Construct stdio array
  // Default: [stdin, stdout, stderr]
  stdio = ['pipe', 'pipe', 'pipe']

  // Add pipes for inputs
  maxPipeIndex = Math.max(...inputBuffers.map(b => b.index), 2)
  WHILE stdio.length <= maxPipeIndex
    stdio.push('pipe')

  spawn(ffmpeg, ffmpegConfig.args, { stdio })

  // Write buffers
  FOR input IN inputBuffers
    process.stdio[input.index].write(input.buffer)
    process.stdio[input.index].end()
```

## 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-blob-audio.ts`
- **Success Criteria**:
  - The test passes (video rendered with audio).
  - Verify that no temp files are created in `os.tmpdir()` matching the blob pattern.
- **Edge Cases**:
  - Multiple blob tracks (multiple pipes).
  - Mix of blob tracks and file tracks.
  - Large blobs (memory usage check, though standard Node heap limits apply).
