# 2026-08-28-RENDERER-Smart-Codec-Selection-Update.md

#### 1. Context & Goal
- **Objective**: Update `CanvasStrategy` to include VP9 and AV1 in the default WebCodecs candidate list, prioritizing H.264 -> VP9 -> AV1 -> VP8.
- **Trigger**: Vision "Smart Codec Selection" and "High Performance". Currently, `CanvasStrategy` falls back from H.264 directly to VP8 (legacy), missing the superior quality and transparency support of VP9 and AV1.
- **Impact**: Improves video quality and compression for Canvas renders. Crucially, enables hardware-accelerated transparent video export (via VP9) by default when `pixelFormat` supports alpha, whereas currently it falls back to software VP8.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/strategies/CanvasStrategy.ts` (Add VP9 and AV1 to `prepare` method candidates)
- **Create**: `packages/renderer/tests/verify-smart-codec-priority.ts` (Test script to verify candidate order)

#### 3. Implementation Spec
- **Architecture**: Extend the `candidates` list construction in `CanvasStrategy.prepare`.
- **Pseudo-Code**:
  - **In `CanvasStrategy.ts`**:
    - Inside `prepare(page)` method:
    - Locate the default candidate logic (and the `videoCodec === 'copy'` logic).
    - Update the sequence of `addCandidate` calls to:
      1. `avc1.4d002a` (H.264 High Profile) - Speed/Compat
      2. `vp9` (VP9) - Quality/Transparency
      3. `av1` (AV1) - Efficiency
      4. `vp8` (VP8) - Fallback
- **Public API Changes**: None. Internal codec selection logic only.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-smart-codec-priority.ts`
- **Success Criteria**:
  - The verification script mocks `page.evaluate` and intercepts the `candidates` array passed to the browser.
  - It confirms that `vp9` and `av1` are present and in the correct order.
  - It confirms that if H.264 is unsupported (e.g. alpha requested), VP9 is selected (simulated).
- **Edge Cases**:
  - **Browser unsupported**: The browser-side logic already iterates candidates and picks the first supported one. Adding candidates is safe.
