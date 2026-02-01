# Context & Goal
- **Objective**: Expand `CanvasStrategy.diagnose()` to report supported WebCodecs (H.264, VP8, VP9, AV1).
- **Trigger**: Vision Gap - "Diagnostics" are currently minimal (existence check only), failing to help users debug "Smart Codec Selection" (hardware acceleration).
- **Impact**: Users can programmatically verify if their environment supports H.264 hardware encoding before starting a render, improving debuggability of the "Dual-Path Architecture".

# File Inventory
- **Modify**: `packages/renderer/src/strategies/CanvasStrategy.ts`
  - Update `diagnose(page)` to inject a script that checks `VideoEncoder.isConfigSupported` for common codecs.
- **Modify**: `packages/renderer/tests/verify-diagnose.ts`
  - Update the test to assert that the `codecs` object exists in the diagnostic report and contains expected keys.

# Implementation Spec
- **Architecture**:
  - The `CanvasStrategy` currently uses a brute-force check in `prepare()` to select a codec but does not expose this information.
  - We will duplicate this logic in `diagnose()` (running in a fresh browser instance) to provide a "Capabilities Report".
  - The report will include a `codecs` object mapping codec names to boolean support flags.

- **Pseudo-Code**:
  ```javascript
  // packages/renderer/src/strategies/CanvasStrategy.ts

  async diagnose(page: Page): Promise<any> {
    return await page.evaluate(async () => {
      console.log('[Helios Diagnostics] Checking Canvas environment...');

      const configs = [
        { id: 'h264', config: { codec: 'avc1.4d002a', width: 1920, height: 1080, avc: { format: 'annexb' } } }, // H.264 High Profile
        { id: 'vp8', config: { codec: 'vp8', width: 1920, height: 1080 } },
        { id: 'vp9', config: { codec: 'vp9', width: 1920, height: 1080 } },
        { id: 'av1', config: { codec: 'av01.0.05M.08', width: 1920, height: 1080 } }
      ];

      const codecs = {};
      const videoEncoderSupported = typeof VideoEncoder !== 'undefined';

      if (videoEncoderSupported) {
        for (const c of configs) {
          try {
            const support = await VideoEncoder.isConfigSupported(c.config);
            codecs[c.id] = support.supported;
          } catch (e) {
            codecs[c.id] = false;
          }
        }
      }

      return {
        videoEncoder: videoEncoderSupported,
        offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
        userAgent: navigator.userAgent,
        codecs: codecs // New field
      };
    });
  }
  ```

- **Public API Changes**:
  - The return type of `Renderer.diagnose()` (implicitly `any`) will now include a `codecs` field in the `browser` object for Canvas mode.

- **Dependencies**: None.

# Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-diagnose.ts`
- **Success Criteria**:
  - The test output should log the diagnostic report containing:
    ```json
    {
      "codecs": {
        "h264": true, // or false
        "vp8": true
      }
    }
    ```
  - The test script should pass (exit code 0).
- **Edge Cases**:
  - If `VideoEncoder` is undefined (e.g. old browser), `codecs` should be empty or all false (handled by pseudo-code).
