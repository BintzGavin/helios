# 2026-02-02-RENDERER-Enable-Robust-Codec-Fallback

#### 1. Context & Goal
- **Objective**: Ensure `CanvasStrategy` maintains high-performance rendering by falling back to standard WebCodecs (H.264/VP8) when a user-specified `intermediateVideoCodec` is unsupported.
- **Trigger**: Currently, specifying an unsupported `intermediateVideoCodec` causes `CanvasStrategy` to fail gracefully into the slow `toDataURL` (image sequence) path, severely degrading performance without warning.
- **Impact**: Improves robustness and user experience by treating the specified codec as a preference rather than a hard constraint, ensuring the GPU-accelerated path is used whenever possible.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/renderer/src/strategies/CanvasStrategy.ts`: Update candidate generation logic in `prepare()`.
  - `packages/renderer/tests/verify-smart-codec-selection.ts`: Add test case for fallback behavior.
- **Read-Only**:
  - `packages/renderer/src/types.ts`
  - `packages/renderer/src/strategies/RenderStrategy.ts`

#### 3. Implementation Spec
- **Architecture**: Modification of the `CanvasStrategy.prepare` initialization logic. The Strategy pattern remains unchanged; this is an internal logic enhancement.
- **Pseudo-Code**:
  ```
  FUNCTION prepare(page):
    candidates = []

    FUNCTION addCandidate(codec):
       ... (existing logic) ...

    IF options.intermediateVideoCodec THEN:
       // Priority 1: User Preference
       addCandidate(options.intermediateVideoCodec)

       // Priority 2: Fallbacks (NEW)
       // Add H.264 and VP8 as backups
       // Note: addCandidate should ideally deduplicate, or we just append
       addCandidate('avc1.4d002a')
       addCandidate('vp8')

    ELSE IF options.videoCodec == 'copy' THEN:
       // Existing logic
       addCandidate('avc1.4d002a')
       addCandidate('vp8')
    ELSE:
       // Existing logic
       addCandidate('avc1.4d002a')
       addCandidate('vp8')

    // The rest of the logic (VideoEncoder.isConfigSupported loop)
    // already picks the FIRST supported candidate.
    // So if the user preference is supported, it is chosen.
    // If not, it proceeds to H.264, then VP8.
  ```
- **Public API Changes**: None. `RendererOptions` remains the same. The behavior of `intermediateVideoCodec` becomes "Preferred Intermediate Codec".
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-smart-codec-selection.ts`
- **Success Criteria**:
  - All existing tests pass.
  - New test case "Test 4: Explicit Override with Fallback" passes:
    - Input: `intermediateVideoCodec: 'unsupported-fake-codec'`
    - Mock: `unsupported-fake-codec` -> `supported: false`, `avc1.4d002a` -> `supported: true`.
    - Output: Selected codec should be `avc1.4d002a`.
- **Edge Cases**:
  - User specifies 'vp8' explicitly -> Should work as primary.
  - Browser supports nothing (rare) -> Should still fallback to `toDataURL`.
