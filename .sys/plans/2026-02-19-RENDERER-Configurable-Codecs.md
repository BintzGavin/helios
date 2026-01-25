#### 1. Context & Goal
- **Objective**: Allow users to customize video encoding parameters (codec, pixel format, quality, preset) in `RendererOptions` to support use cases like transparent video (ProRes/QT RLE) and high-quality archiving.
- **Trigger**: "Current Renderer implementation hardcodes FFmpeg output to 'libx264' and 'yuv420p'" (Vision Gap).
- **Impact**: Unlocks transparent video export (via DomStrategy), configurable quality/size trade-offs, and compatibility with non-standard workflows.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/types.ts` (Add codec options)
- **Modify**: `packages/renderer/src/strategies/CanvasStrategy.ts` (Apply options to FFmpeg args)
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts` (Apply options to FFmpeg args)
- **Create**: `packages/renderer/tests/verify-codecs.ts` (Verification script)

#### 3. Implementation Spec
- **Architecture**: Extend `RendererOptions` to include optional FFmpeg overrides. Update strategies to prioritize these options over defaults.
- **Public API Changes**:
  - Update `RendererOptions` interface:
    - `videoCodec?: string` (default: 'libx264')
    - `pixelFormat?: string` (default: 'yuv420p')
    - `crf?: number` (default: undefined)
    - `preset?: string` (default: 'fast')
    - `videoBitrate?: string` (default: undefined)
- **Logic**:
  - In `getFFmpegArgs`, replace hardcoded strings with values from `options`.
  - Default values (if options are missing):
    - `videoCodec`: 'libx264'
    - `pixelFormat`: 'yuv420p'
    - `movflags`: '+faststart'
  - If `options.crf` is provided, add `-crf ${options.crf}`.
  - If `options.preset` is provided, add `-preset ${options.preset}`.
  - If `options.videoBitrate` is provided, add `-b:v ${options.videoBitrate}`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx ts-node packages/renderer/tests/verify-codecs.ts`
- **Success Criteria**: Render completes with custom arguments (logged to console) without FFmpeg error.
- **Edge Cases**:
  - Invalid codec (FFmpeg should fail, `Renderer` should catch/propagate error).
  - WebCodecs transparency (Known limitation: CanvasStrategy might still use VP8 without alpha).
