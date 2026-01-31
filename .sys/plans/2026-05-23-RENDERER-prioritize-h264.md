# 📋 RENDERER: Prioritize H.264 Intermediate Codec

## 1. Context & Goal
- **Objective**: Change the default intermediate codec selection in `CanvasStrategy` to prioritize H.264 (AVC) over VP8 when no specific codec is requested.
- **Trigger**: Vision "Performance When It Matters" - VP8 is often software-decoded/encoded, while H.264 is widely hardware-accelerated.
- **Impact**: Improves rendering performance on systems with hardware H.264 encoders (e.g., Apple Silicon, NVIDIA GPUs) without requiring 'copy' mode.

## 2. File Inventory
- **Modify**: `packages/renderer/src/strategies/CanvasStrategy.ts` (Update candidate selection logic)
- **Modify**: `packages/renderer/tests/verify-smart-codec-selection.ts` (Update test expectations)
- **Read-Only**: `packages/renderer/src/types.ts`

## 3. Implementation Spec

### Architecture
- **Strategy Pattern**: Enhance `CanvasStrategy.prepare` to construct a smarter candidate list.
- **Fallback Chain**: The browser will try candidates in order:
  1. H.264 High Profile (`avc1.4d002a`) - High quality, hardware accelerated.
  2. VP8 (`vp8`) - Universal fallback (software).

### Pseudo-Code

#### `packages/renderer/src/strategies/CanvasStrategy.ts`
- **Function**: `prepare(page)`
  - **Logic**:
    - IF `intermediateVideoCodec` is set:
      - Add it to candidates.
    - ELSE IF `videoCodec` is 'copy':
      - Add 'avc1.4d002a'.
      - Add 'vp8'.
    - ELSE (Default):
      - ADD 'avc1.4d002a' to candidates (New Step).
      - Add 'vp8' to candidates (Existing Step).
  - **Constraint**: Ensure `avc1` is added *before* `vp8` in the default block.

#### `packages/renderer/tests/verify-smart-codec-selection.ts`
- **Function**: `runTest()` -> Test 2: Default Mode
  - **Logic**:
    - Mock the page evaluation to simulate H.264 support (or just inspect args).
    - ASSERT `capturedArgs.candidates[0].codecString` EQUALS 'avc1.4d002a'.
    - ASSERT `capturedArgs.candidates[1].codecString` EQUALS 'vp8'.
    - ASSERT `ffmpegArgs` uses 'h264' format flag.

## 4. Test Plan

### Verification
- **Command**: `npx tsx packages/renderer/tests/verify-smart-codec-selection.ts`

### Success Criteria
- Test 2 (Default Mode) passes with H.264 as the primary candidate.
- Test 1 (Copy Mode) and Test 3 (Explicit Override) continue to pass.

### Edge Cases
- **H.264 Unsupported**: The browser-side script loop (already implemented) handles this by falling back to the next candidate (VP8). We are only changing the *input list*, so the fallback logic remains valid.
