# 2026-02-19-RENDERER-Configurable-WebCodecs

#### 1. Context & Goal
- **Objective**: Allow users to configure the intermediate codec used by `CanvasStrategy` for WebCodecs capture (e.g., VP9, AV1) instead of being hardcoded to VP8.
- **Trigger**: "Configurable Codecs" vision gap; Hardcoded VP8 limits performance and quality options.
- **Impact**: Enables higher quality (VP9) or more efficient (AV1) intermediate capture formats when hardware support is available.

#### 2. File Inventory
- **Create**:
  - `packages/renderer/tests/test-canvas-strategy.ts`: Integration test to verify IVF header generation.
- **Modify**:
  - `packages/renderer/src/types.ts`: Add `intermediateVideoCodec` optional string property to `RendererOptions`.
  - `packages/renderer/src/strategies/CanvasStrategy.ts`: Implement codec selection and dynamic IVF FourCC generation.
- **Read-Only**:
  - `packages/renderer/src/index.ts`

#### 3. Implementation Spec
- **Architecture**: Extend Strategy Pattern configuration. Map input codec strings to WebCodecs configuration strings and IVF FourCC codes.
- **Pseudo-Code**:
  - IN `CanvasStrategy.prepare`:
    - RESOLVE `targetCodec` from options or default to 'vp8'
    - DETERMINE `fourCC` and `codecString`:
      - IF 'vp8': SET fourCC='VP80', codecString='vp8'
      - IF 'vp9': SET fourCC='VP90', codecString='vp9'
      - IF 'av1': SET fourCC='AV01', codecString='av01.0.05M.08' (Main Profile, Level 2.1)
    - INJECT into page context: `targetCodec`, `fourCC`
    - IN Browser Context:
      - WRITE `fourCC` to bytes 8-11 of IVF Header Buffer
      - CONFIGURE `VideoEncoder` with `codec: codecString`
- **Public API Changes**:
  - `RendererOptions` gains `intermediateVideoCodec?: 'vp8' | 'vp9' | 'av1' | string`
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx ts-node packages/renderer/tests/test-canvas-strategy.ts`
- **Success Criteria**:
  - Test instantiates `CanvasStrategy` with `intermediateVideoCodec: 'vp9'`.
  - Test calls `prepare(page)`.
  - Test inspects `window.heliosWebCodecs.chunks[0]` (Header).
  - Test asserts bytes 8-11 equal 'VP90'.
  - Logs "✅ VP9 FourCC Verified".
- **Edge Cases**:
  - Unsupported codec: Should log error and fallback to `toDataURL` (existing behavior for failed `isConfigSupported`).
