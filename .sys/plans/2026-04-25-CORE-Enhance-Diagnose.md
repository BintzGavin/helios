# 2026-04-25-CORE-Enhance-Diagnose

## 1. Context & Goal
- **Objective**: Enhance `Helios.diagnose()` to provide a comprehensive report of the runtime environment's capabilities, including WebGL, WebAudio, Color Gamut, and Video Codec support.
- **Trigger**: The "AI Integration Parity" vision in `README.md` calls for "Diagnostics for AI Environments". The current implementation only checks for basic APIs (`waapi`, `webCodecs`, `offscreenCanvas`).
- **Impact**: This enables AI agents and developers to debug rendering issues more effectively by identifying missing capabilities (e.g., lack of H.264 support or WebGL) in the environment.

## 2. File Inventory
- **Modify**: `packages/core/src/index.ts` (Update `DiagnosticReport` interface and `Helios.diagnose` method)
- **Modify**: `packages/core/src/index.test.ts` (Update tests to verify new diagnostic fields)
- **Read-Only**: `packages/core/src/drivers/DomDriver.ts` (Check for compatibility, though not directly modified)

## 3. Implementation Spec
- **Architecture**: Extend the existing static `Helios.diagnose()` method to perform asynchronous checks for codec support and feature detection.
- **Public API Changes**:
    - Update `DiagnosticReport` interface:
      ```typescript
      export interface DiagnosticReport {
        waapi: boolean;
        webCodecs: boolean;
        offscreenCanvas: boolean;
        webgl: boolean;
        webgl2: boolean;
        webAudio: boolean;
        colorGamut: 'srgb' | 'p3' | 'rec2020' | null;
        videoCodecs: {
          h264: boolean;
          vp8: boolean;
          vp9: boolean;
          av1: boolean;
        };
        userAgent: string;
      }
      ```
- **Pseudo-Code**:
    - In `Helios.diagnose()`:
        - Check `webgl` and `webgl2` by creating a canvas (if `document` or `OffscreenCanvas` is available) and calling `getContext`.
        - Check `webAudio` by looking for `AudioContext` or `webkitAudioContext` on `window`.
        - Check `colorGamut` using `window.matchMedia` (if available) with queries for `(color-gamut: p3)` and `(color-gamut: rec2020)`. Fallback to `null` if check unavailable.
        - Check `videoCodecs` using `VideoEncoder.isConfigSupported()` for:
            - H.264: `{ codec: 'avc1.42001E', width: 1920, height: 1080, bitrate: 2_000_000, framerate: 30 }`
            - VP8: `{ codec: 'vp8', ... }`
            - VP9: `{ codec: 'vp09.00.10.08', ... }`
            - AV1: `{ codec: 'av01.0.04M.08', ... }`
          - Handle `VideoEncoder` missing gracefully (all false).
        - Return the populated report.
- **Dependencies**: None. This is a standalone enhancement.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**: `index.test.ts` passes, and the `diagnose()` method returns an object with all new fields populated.
- **Edge Cases**:
    - Run in Node.js environment (via tests) to ensure checks don't crash when DOM/Canvas APIs are missing. Mocking may be required for full coverage of "true" values in Node.
    - Verify that `VideoEncoder.isConfigSupported` failure doesn't crash the report generation.
