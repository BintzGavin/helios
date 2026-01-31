# 2026-04-23-RENDERER-validate-codec-compatibility

## 1. Context & Goal
- **Objective**: Prevent the Renderer from attempting to use `videoCodec: 'copy'` when the rendering strategy produces image sequences (DomStrategy or CanvasStrategy fallback), which causes fatal FFmpeg errors.
- **Trigger**: Audit of `DomStrategy` and `FFmpegBuilder` interactions revealed that `copy` codec is allowed but technically impossible for image-to-video pipelines.
- **Impact**: Improves User Experience by failing fast with a clear error message instead of a cryptic FFmpeg process crash.

## 2. File Inventory
- **Create**:
    - `packages/renderer/tests/verify-codec-validation.ts`: A verification script to confirm that invalid configurations throw errors.
- **Modify**:
    - `packages/renderer/src/strategies/DomStrategy.ts`: Add validation in the constructor.
    - `packages/renderer/src/strategies/CanvasStrategy.ts`: Add validation in `prepare()` method.
- **Read-Only**:
    - `packages/renderer/src/types.ts`
    - `packages/renderer/src/utils/FFmpegBuilder.ts`

## 3. Implementation Spec

### DomStrategy
- **Architecture**: Enforce "Fail Fast" in the constructor.
- **Pseudo-Code**:
    - CHECK if `options.videoCodec` is strictly equal to `'copy'`.
    - IF yes, THROW Error with message: "DomStrategy produces image sequences and cannot be used with 'copy' codec. Please use a transcoding codec like 'libx264' (default)."

### CanvasStrategy
- **Architecture**: Enforce validation during the `prepare` phase, where the decision to use WebCodecs vs Image Fallback is made.
- **Pseudo-Code**:
    - IN `prepare(page)` method:
    - AFTER determining `this.useWebCodecs`:
    - IF `this.useWebCodecs` is FALSE AND `this.options.videoCodec` is strictly equal to `'copy'`:
        - THROW Error with message: "CanvasStrategy failed to initialize WebCodecs and fell back to image capture, which cannot be used with 'copy' codec. Ensure VideoEncoder is supported or use a transcoding codec."

## 4. Test Plan
- **Verification**: `npx ts-node packages/renderer/tests/verify-codec-validation.ts`
- **Success Criteria**:
    - The test script MUST try to instantiate `DomStrategy` with `videoCodec: 'copy'` and catch the expected error.
    - The test script MUST try to run `CanvasStrategy.prepare()` (with mocked `VideoEncoder` = undefined) with `videoCodec: 'copy'` and catch the expected error.
    - The test script MUST pass if both errors are caught as expected.
- **Edge Cases**:
    - `videoCodec` is undefined (Should NOT throw).
    - `videoCodec` is 'libx264' (Should NOT throw).
    - `CanvasStrategy` with WebCodecs supported (Should NOT throw even if 'copy' is used).
