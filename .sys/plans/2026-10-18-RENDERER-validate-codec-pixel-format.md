# 2026-10-18-RENDERER-validate-codec-pixel-format.md

## 1. Context & Goal
- **Objective**: Implement validation in `FFmpegBuilder` to fail fast when incompatible codec and pixel format combinations are requested.
- **Trigger**: Vision gap identified in `.jules/RENDERER.md`. FFmpeg fails silently or produces corrupted output when users request incompatible combinations like `libx264` (H.264) with `yuva420p` (Alpha channel).
- **Impact**: Improves developer experience by providing clear, actionable error messages instead of obscure FFmpeg process failures.

## 2. File Inventory
- **Create**:
  - `packages/renderer/tests/verify-codec-pixel-format-mismatch.ts`: A verification script to ensure the validation logic works as expected.
- **Modify**:
  - `packages/renderer/src/utils/FFmpegBuilder.ts`: Add validation logic to `getArgs`.
- **Read-Only**:
  - `packages/renderer/src/types.ts`
  - `packages/renderer/src/strategies/CanvasStrategy.ts`

## 3. Implementation Spec
- **Architecture**:
  - In `FFmpegBuilder.getArgs`, before constructing the FFmpeg arguments, check `options.videoCodec` and `options.pixelFormat`.
  - Focus primarily on `libx264` (H.264) and `libx265` (H.265), which do not support alpha channels in standard profiles.
  - Define a validation check:
    - If `videoCodec` is `libx264` or `libx265` (or aliases like `h264`, `hevc`):
      - If `pixelFormat` implies alpha (starts with `yuva`, `argb`, `rgba`, `abgr`, `bgra`):
        - Throw `Error: The codec '${videoCodec}' does not support alpha channel pixel format '${pixelFormat}'. Please use a codec that supports transparency (e.g., 'libvpx-vp9', 'prores_ks', 'qtrle') or use a non-alpha pixel format (e.g., 'yuv420p').`
- **Pseudo-Code**:
  ```typescript
  const codec = options.videoCodec || 'libx264';
  const pixFmt = options.pixelFormat || 'yuv420p';
  if ((codec === 'libx264' || codec === 'libx265') && (pixFmt.startsWith('yuva') || pixFmt.includes('bgr') || pixFmt.includes('rgb'))) {
     throw new Error(...);
  }
  ```
- **Public API Changes**: None (internal validation logic).
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npx tsx packages/renderer/tests/verify-codec-pixel-format-mismatch.ts`.
- **Success Criteria**:
  - The test must successfully catch the error when `libx264` + `yuva420p` is used.
  - The test must pass when `libvpx-vp9` + `yuva420p` is used.
  - The test must pass when `libx264` + `yuv420p` is used.
- **Edge Cases**:
  - `pixelFormat` not specified (defaults to `yuv420p`, test should pass).
  - Test with other codecs like `prores_ks` (should allow alpha).
