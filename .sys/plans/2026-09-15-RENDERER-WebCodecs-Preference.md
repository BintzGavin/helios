# Plan: WebCodecs Preference Control

## 1. Context & Goal
- **Objective**: Implement `webCodecsPreference` in `RendererOptions` to control `CanvasStrategy`'s usage of WebCodecs (Hardware vs Software vs Disabled).
- **Trigger**: The current implementation always prioritizes hardware encoding, which can compromise deterministic rendering (bit-exactness) across different GPUs. There is also no way to forcibly disable WebCodecs if artifacts occur.
- **Impact**: Enables strict determinism for CI/CD pipelines (by forcing software encoding) and improves stability by allowing users to bypass WebCodecs if needed.

## 2. File Inventory
- **Modify**: `packages/renderer/src/types.ts` (Add `webCodecsPreference` option)
- **Modify**: `packages/renderer/src/strategies/CanvasStrategy.ts` (Implement preference logic in `prepare`)
- **Read-Only**: `packages/renderer/src/Renderer.ts`

## 3. Implementation Spec
- **Architecture**:
  - Update `CanvasStrategy.prepare` to accept the new preference.
  - In the candidate sorting logic:
    - If `preference === 'software'`: Prioritize candidates with `isHardware: false`.
    - If `preference === 'hardware'`: Prioritize candidates with `isHardware: true` (default).
  - In the initialization logic:
    - If `preference === 'disabled'`: Skip WebCodecs detection entirely and fall back to `toDataURL` (Image Sequence).
- **Public API Changes**:
  - `RendererOptions.webCodecsPreference`: `'hardware' | 'software' | 'disabled'` (default: `'hardware'`).
- **Pseudo-Code**:
  ```typescript
  // In CanvasStrategy.prepare
  const preference = this.options.webCodecsPreference || 'hardware';

  if (preference === 'disabled') {
    console.log('CanvasStrategy: WebCodecs disabled by preference. Falling back to toDataURL.');
    this.useWebCodecs = false;
    return;
  }

  // ... inside evaluate ...
  supportedCandidates.sort((a, b) => {
      // 1. Respect Hardware/Software Preference
      if (preference === 'software') {
          // Prefer Software: isHardware=false comes first
          if (a.isHardware !== b.isHardware) {
              return a.isHardware ? 1 : -1;
          }
      } else {
          // Prefer Hardware (default): isHardware=true comes first
          if (a.isHardware !== b.isHardware) {
              return b.isHardware ? 1 : -1;
          }
      }

      // 2. Codec Preference (H.264 > others if tied)
      if (a.candidate.isH264 !== b.candidate.isH264) {
          return a.candidate.isH264 ? -1 : 1;
      }

      // 3. Original Index
      return a.candidate.index - b.candidate.index;
  });
  ```
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Create a test `tests/verify-webcodecs-preference.ts`.
  - **Case 1: Disabled**: Run render with `webCodecsPreference: 'disabled'`. Verify that logs show "Falling back to toDataURL" and do *not* show "Using WebCodecs".
  - **Case 2: Software**: Run render with `webCodecsPreference: 'software'`. Verify that logs show "isHardware: false" or check that the chosen codec is likely software (if identifiable).
    - Note: This depends on browser implementation. We can mock `VideoEncoder.isConfigSupported` or rely on `CanvasStrategy` returning diagnostic info.
  - **Case 3: Hardware**: Run render with `webCodecsPreference: 'hardware'`. Verify logs show "isHardware: true" (if available).
- **Success Criteria**: The renderer respects the preference, effectively disabling WebCodecs or reordering candidates.
- **Edge Cases**:
  - Invalid preference value (should default to hardware).
  - Preference 'software' but no software codec available (should fallback to hardware or fail? Currently fallback logic selects the *first* supported candidate. So it will pick HW if only HW is available. This is acceptable "preference" behavior).
