# 2026-10-18-RENDERER-WebCodecs-Preference.md

## 1. Context & Goal
- **Objective**: Introduce `webCodecsPreference` option to `RendererOptions` to control hardware acceleration usage in `CanvasStrategy`.
- **Trigger**: Vision gap identified in `.jules/RENDERER.md` (WebCodecs Determinism Gap). The current implementation strictly prioritizes hardware encoding, which causes non-determinism across environments (e.g., CI vs Local) and violates the goal of bit-exact regression testing.
- **Impact**: Unlocks deterministic rendering for regression testing by allowing users (and tests) to force software encoding or disable WebCodecs entirely. This directly addresses the documented "WebCodecs Determinism Gap".

## 2. File Inventory
- **Create**:
  - `packages/renderer/tests/verify-webcodecs-preference.ts`: A new verification script to test the feature.
- **Modify**:
  - `packages/renderer/src/types.ts`: Add `webCodecsPreference` to `RendererOptions`.
  - `packages/renderer/src/strategies/CanvasStrategy.ts`: Implement preference logic in `prepare` method to respect the new option.
- **Read-Only**:
  - `packages/renderer/README.md` (for context)
  - `packages/renderer/tests/verify-hardware-codec-selection.ts` (as reference for testing)

## 3. Implementation Spec
- **Architecture**:
  - Extend `RendererOptions` interface with `webCodecsPreference?: 'hardware' | 'software' | 'disabled'`.
  - In `CanvasStrategy.prepare()`, pass this preference to the browser context via `page.evaluate`.
  - Inside the browser-side script:
    - If `preference === 'disabled'`, return `{ supported: false, reason: 'Disabled by user preference' }` immediately.
    - If `preference === 'software'`, modify the sorting logic to prioritize candidates where `!isHardware`.
    - If `preference === 'hardware'` (default), maintain the existing logic prioritizing `isHardware`.
- **Public API Changes**:
  - `RendererOptions.webCodecsPreference` (optional, default: 'hardware' implied).
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npm run test packages/renderer/tests/verify-webcodecs-preference.ts`.
- **Success Criteria**:
  - **Case 1 (Software Preference)**: With `webCodecsPreference: 'software'`, the strategy selects a software codec (e.g., H.264 software) even if a hardware codec (e.g., VP9 hardware) is available.
  - **Case 2 (Disabled)**: With `webCodecsPreference: 'disabled'`, the strategy falls back to `toDataURL` (Canvas capture) and `useWebCodecs` is false.
  - **Case 3 (Hardware/Default)**: With `webCodecsPreference: 'hardware'` (or omitted), it selects a hardware codec if available.
- **Edge Cases**:
  - Browser has no hardware support -> 'hardware' preference falls back to software (existing behavior).
  - Browser has no software support (unlikely) -> 'software' preference might fail or pick whatever is available.
