# 2026-10-18 - Strict Codec/Pixel Format Validation

## 1. Context & Goal
- **Objective**: Implement strict validation in `FFmpegBuilder` to prevent silent failures when users request alpha transparency (e.g., `yuva420p`) with incompatible codecs like `libx264`.
- **Trigger**: Identified in Journal entry `[1.79.1] - Codec/PixelFormat Mismatch` where users experienced silent failures or corrupted output.
- **Impact**: Improves developer experience by "failing fast" with clear error messages suggesting valid alternatives (like `libvpx-vp9` or `prores_ks`) instead of letting FFmpeg fail obscurely or produce incorrect video.

## 2. File Inventory
- **Modify**: `packages/renderer/src/utils/FFmpegBuilder.ts` (Add validation logic to `getArgs`)
- **Modify**: `packages/renderer/tests/verify-codec-validation.ts` (Add new test cases)
- **Read-Only**: `packages/renderer/src/types.ts` (Reference `RendererOptions`)

## 3. Implementation Spec
- **Architecture**:
  - Enhance `FFmpegBuilder.getArgs` to validate input options before generating FFmpeg arguments.
  - No new public API; this is an internal validation improvement.
- **Validation Logic**:
  - Define `alphaPixelFormats`: `['yuva420p', 'yuva422p', 'yuva444p', 'rgba', 'bgra', 'abgr', 'argb', 'gbrap', 'yuva444p10le']`.
  - Define `nonAlphaCodecs`: `['libx264', 'libx265', 'h264', 'hevc']`.
  - Logic:
    ```typescript
    if (alphaPixelFormats.includes(pixelFormat) && nonAlphaCodecs.includes(videoCodec)) {
      throw new Error("Codec '${videoCodec}' does not support alpha channel pixel format '${pixelFormat}'. Please use 'libvpx-vp9' (WebM) or 'prores_ks' (MOV) for transparency.");
    }
    ```
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npx tsx packages/renderer/tests/verify-codec-validation.ts`
- **Success Criteria**:
  - The script should output `✅ PASS: FFmpegBuilder threw expected error.` for the invalid case (`libx264` + `yuva420p`).
  - The script should output `✅ PASS: FFmpegBuilder allowed valid combination.` for the valid case (`libvpx-vp9` + `yuva420p`).
- **Edge Cases**:
  - Default values: Ensure `videoCodec` defaults to `libx264` and `pixelFormat` defaults to `yuv420p` if undefined, before validation runs.
