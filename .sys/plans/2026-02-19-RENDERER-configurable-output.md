# Spec: Enable Configurable Output Formats in Renderer

## 1. Context & Goal
- **Objective**: Allow users to configure video bitrate, output codec, pixel format, and quality presets (CRF, preset) in the `Renderer`.
- **Trigger**: Vision Gap - "Production Rendering" requires high-fidelity output. Currently, bitrate is hardcoded to 5Mbps and output format is fixed to `libx264`/`yuv420p`, preventing transparency support and quality control.
- **Impact**: Unlocks support for transparent video exports (e.g., WebM VP9), high-quality masters (ProRes), and efficient draft renders.

## 2. File Inventory
- **Modify**: `packages/renderer/src/types.ts`
  - Add optional configuration fields to `RendererOptions`.
- **Modify**: `packages/renderer/src/strategies/CanvasStrategy.ts`
  - Pass bitrate config to WebCodecs `VideoEncoder`.
  - Update FFmpeg args to use config options.
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts`
  - Update FFmpeg args to use config options.
  - Implement JPEG quality control if applicable (future optimization, out of scope for now, focus on FFmpeg output).
- **Create**: `packages/renderer/tests/test-output-config.ts`
  - A script to verify that different options produce different FFmpeg commands and output files.

## 3. Implementation Spec

### Architecture
Extend the `RendererOptions` interface to serve as the single source of truth for output configuration. The `CanvasStrategy` and `DomStrategy` will consume these options:
1. `CanvasStrategy` will use `videoBitrate` to configure the browser-side `VideoEncoder` (WebCodecs).
2. Both strategies will use `videoCodec`, `videoBitrate`, `pixelFormat`, `crf`, and `preset` to construct the FFmpeg output arguments.

### Pseudo-Code

#### `packages/renderer/src/types.ts`
DEFINE interface RendererOptions extension:
  - videoBitrate?: number (bits per second)
  - videoCodec?: string (e.g., 'libx264', 'libvpx-vp9')
  - pixelFormat?: string (e.g., 'yuv420p', 'yuva420p')
  - crf?: number (Constant Rate Factor)
  - preset?: string (FFmpeg preset e.g. 'fast', 'veryslow')

#### `packages/renderer/src/strategies/CanvasStrategy.ts`
METHOD prepare(page):
  GET bitrate FROM options.videoBitrate OR DEFAULT 5_000_000
  PASS bitrate TO page.evaluate
  INSIDE BROWSER:
    SET encoderConfig.bitrate = bitrate

METHOD getFFmpegArgs(options, outputPath):
  SET codec = options.videoCodec OR 'libx264'
  SET pix_fmt = options.pixelFormat OR 'yuv420p'
  SET bitrate = options.videoBitrate

  INIT outputArgs list
  ADD '-c:v', codec
  ADD '-pix_fmt', pix_fmt

  IF bitrate IS DEFINED:
    ADD '-b:v', bitrate

  IF options.crf IS DEFINED:
    ADD '-crf', options.crf

  IF options.preset IS DEFINED:
    ADD '-preset', options.preset

  APPEND other args (movflags, audio, outputPath)
  RETURN full args list

#### `packages/renderer/src/strategies/DomStrategy.ts`
METHOD getFFmpegArgs(options, outputPath):
  (Similar logic to CanvasStrategy for constructing outputArgs)
  SET codec = options.videoCodec OR 'libx264'
  SET pix_fmt = options.pixelFormat OR 'yuv420p'
  ...
  RETURN full args list

## 4. Test Plan

### Verification
Run the new verification script:
`npx ts-node packages/renderer/tests/test-output-config.ts`

### Test Script Logic (`test-output-config.ts`)
1. IMPORT Renderer from index
2. DEFINE test cases:
   - Case A: Bitrate 500k.
   - Case B: Codec 'libvpx-vp9', PixelFormat 'yuva420p', Output 'out.webm'.
3. FOR EACH case:
   - INSTANTIATE Renderer with options
   - CALL render() on a sample composition (e.g. `examples/animation-helpers/composition.html` or a simple data URL if supported, else use file path)
   - CHECK if output file exists
   - (Optional) CHECK file size of Case A vs Default (should be smaller)
   - LOG success/failure

### Success Criteria
- Case A produces a valid video file.
- Case B produces a valid `.webm` file.
- No TypeScript errors in `types.ts` or strategies.
- Existing tests (`verify-range-render.ts`) still pass (regression test).
