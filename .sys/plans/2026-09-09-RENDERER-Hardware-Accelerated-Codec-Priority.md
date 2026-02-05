# 2026-09-09-RENDERER-Hardware-Accelerated-Codec-Priority.md

## 1. Context & Goal
- **Objective**: Update `CanvasStrategy` to prioritize hardware-accelerated codecs (checking `navigator.mediaCapabilities`) and select the best available option (Hardware > Software) rather than the first supported one.
- **Trigger**: "GPU Acceleration" vision. Current implementation likely selects Software H.264 over Hardware VP9 because it stops at the first match and relies on a potentially non-standard `type` property.
- **Impact**: Ensures the renderer uses the most efficient codec (Hardware) available, improving rendering speed and reducing CPU usage, especially in environments with partial codec support.

## 2. File Inventory
- **Modify**: `packages/renderer/src/strategies/CanvasStrategy.ts` (Implement candidate collection, `mediaCapabilities` check, and sorting logic).
- **Create**: `packages/renderer/tests/verify-hardware-codec-selection.ts` (Verify logic using mocked browser environment).

## 3. Implementation Spec
- **Architecture**:
  - Enhance `CanvasStrategy.prepare` evaluation script.
  - Instead of a loop that `break`s on first supported codec:
    - Iterate all candidates.
    - Check support using `VideoEncoder.isConfigSupported`.
    - Check hardware support using `navigator.mediaCapabilities.encodingInfo` (checking `powerEfficient`).
    - Store all supported candidates with their capabilities.
  - Sort candidates:
    - Primary Key: `powerEfficient` (Hardware first).
    - Secondary Key: `isH264` (H.264 preferred if both are hardware or both software).
    - Tertiary Key: Original preference order (VP9 > AV1 > VP8).
  - Select the top candidate.
  - Fallback to Software if no Hardware codec is found.
  - Update `diagnose` to also use `mediaCapabilities` for more accurate reporting.

- **Pseudo-Code (CanvasStrategy.prepare script)**:
  ```javascript
  const supported = [];
  for (const candidate of candidates) {
    // 1. Check VideoEncoder Support
    const config = createConfig(candidate);
    const veSupport = await VideoEncoder.isConfigSupported(config);
    if (!veSupport.supported) continue;

    // 2. Check MediaCapabilities (for Hardware)
    // Map config to MediaCapabilities config (contentType, etc.)
    const mcConfig = mapToMcConfig(candidate, config);
    const mcInfo = await navigator.mediaCapabilities.encodingInfo(mcConfig);

    supported.push({
      candidate,
      config,
      hardware: mcInfo.powerEfficient || veSupport.type === 'hardware' // Fallback to non-std prop
    });
  }

  if (supported.length === 0) return { supported: false };

  // Sort: Hardware first, then H.264, then Index
  supported.sort((a, b) => {
    if (a.hardware !== b.hardware) return b.hardware ? 1 : -1;
    if (a.candidate.isH264 !== b.candidate.isH264) return a.candidate.isH264 ? -1 : 1;
    return a.candidate.index - b.candidate.index;
  });

  const selected = supported[0];
  // ... initialize VideoEncoder with selected.config ...
  ```

- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-hardware-codec-selection.ts`
- **Success Criteria**:
  - Test mocks `VideoEncoder` and `navigator.mediaCapabilities`.
  - Test scenario: H.264 is Software, VP9 is Hardware.
  - Result: Strategy selects VP9.
  - Test scenario: H.264 is Hardware, VP9 is Hardware.
  - Result: Strategy selects H.264 (Preference).
- **Edge Cases**:
  - `navigator.mediaCapabilities` undefined (fallback to `VideoEncoder` check).
  - No codec supported.
  - Mapping logic for `contentType`.
