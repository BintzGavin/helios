# Plan: Enable Transparent Canvas Rendering

## 1. Context & Goal
- **Objective**: Enable transparent video rendering in `CanvasStrategy` by configuring `VideoEncoder` to preserve the alpha channel when the output format requires it.
- **Trigger**: The Vision implies support for "Programmatic Video" and "Overlays", but currently `CanvasStrategy` defaults to `alpha: 'discard'`, rendering transparent canvases as opaque (black) when using WebCodecs. This prevents creating transparent WebM/VP9 videos.
- **Impact**: Unlocks the ability to generate transparent video overlays using the high-performance WebCodecs path.

## 2. File Inventory
- **Create**:
  - `packages/renderer/scripts/verify-transparency.ts`: Verification script to test alpha channel preservation.
- **Modify**:
  - `packages/renderer/src/strategies/CanvasStrategy.ts`: Logic to infer alpha mode from `pixelFormat`.
- **Read-Only**:
  - `packages/renderer/src/types.ts`
  - `packages/renderer/src/index.ts`

## 3. Implementation Spec

### Architecture
- **Strategy Pattern**: Update `CanvasStrategy` (specific to Canvas mode) to intelligently configure the `VideoEncoder`.
- **Inference**: Use `RendererOptions.pixelFormat` as the signal for intent. If the user requests an alpha-capable pixel format (e.g., `yuva420p`), we infer they want to keep the alpha channel from the source canvas.

### Pseudo-Code

#### `packages/renderer/src/strategies/CanvasStrategy.ts`

```typescript
// Inside prepare(page) method:

// 1. Determine Alpha Intent
SET pixelFormat = options.pixelFormat OR 'yuv420p'
SET hasAlpha = CHECK if pixelFormat startsWith 'yuva' OR contains 'rgba'/'bgra'/'argb'/'abgr'

// 2. Configure Encoder
SET alphaMode = hasAlpha ? 'keep' : 'discard'

// 3. Update Evaluation Block
CALL page.evaluate with { ..., alphaMode }:
  // Inside browser context:
  SET encoderConfig = {
    codec: ...,
    width: ...,
    height: ...,
    bitrate: ...,
    alpha: config.alphaMode // Pass 'keep' or 'discard'
  }

  // Try checking support
  CALL VideoEncoder.isConfigSupported(encoderConfig)

  // If supported, initialize encoder
  NEW VideoEncoder({
    ...,
    error: ...
  })

  // Note: The IVF header generation might need to account for alpha?
  // VP8/VP9/AV1 bitstreams handle alpha internally. IVF container is generic.
  // So no change to IVF header needed usually, unless specific offsets change.
  // Standard IVF implementation is agnostic.

// 4. Logging
IF supported:
  LOG "CanvasStrategy: Using WebCodecs ... with alpha: {alphaMode}"
```

### Public API Changes
- None. `RendererOptions.pixelFormat` is already existing. We are just using it to drive internal behavior.

### Dependencies
- None.

## 4. Test Plan

### Verification
- **Command**: `npx ts-node packages/renderer/scripts/verify-transparency.ts`
- **Script Logic**:
  1. Instantiate `Renderer` with `mode: 'canvas'`.
  2. Set `pixelFormat: 'yuva420p'`, `videoCodec: 'libvpx-vp9'`, `output: 'output/transparent.webm'`.
  3. Render a simple composition (e.g., use a data URL or small HTML with transparent body and a colored shape).
  4. Capture console output.
  5. Assert that "Using WebCodecs ... with alpha: keep" is logged.
  6. Assert that render completes without error.

- **Success Criteria**:
  - Log confirms `alpha: keep`.
  - Process exits with code 0.

### Edge Cases
- **Unsupported Codec**: If user requests `alpha: 'keep'` on H.264 (which typically fails `isConfigSupported` for alpha), the strategy should fall back to `toDataURL` (which uses PNG/Base64 and supports transparency), ensuring the render still succeeds and preserves alpha (albeit slower).
- **Opaque Format**: If `pixelFormat` is `yuv420p` (default), `alpha` should be `discard`.
