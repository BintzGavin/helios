# Plan: Enable Low-Bitrate Stream Copy

## 1. Context & Goal
- **Objective**: Update `CanvasStrategy` to strictly respect the user's provided `videoBitrate` when `videoCodec: 'copy'` is used, bypassing the default 25Mbps quality floor.
- **Trigger**: "Smart Codec Selection" gap. Currently, setting `videoBitrate: '1M'` with `videoCodec: 'copy'` incorrectly produces a ~25Mbps video because `CanvasStrategy` enforces a high-quality floor intended for intermediate renders (re-encoding), effectively ignoring the user's bitrate constraint for direct stream copies.
- **Impact**: Enables generation of low-bitrate videos (e.g., for previews or bandwidth-constrained scenarios) directly from WebCodecs without requiring a secondary re-encoding step.

## 2. File Inventory
- **Create**:
  - `packages/renderer/tests/verify-copy-bitrate.ts`: A specific verification script to assert that `videoCodec: 'copy'` respects low bitrate settings.
- **Modify**:
  - `packages/renderer/src/strategies/CanvasStrategy.ts`: Update bitrate calculation logic to skip the `Math.max(25Mbps, ...)` floor when in copy mode.
- **Read-Only**:
  - `packages/renderer/src/types.ts`
  - `packages/renderer/tests/verify-bitrate.ts`

## 3. Implementation Spec
- **Architecture**:
  - In `CanvasStrategy.prepare`, refine the `intermediateBitrate` calculation.
  - Current Logic: `Math.max(25_000_000, targetBitrate, autoBitrate)` (Always forces >= 25Mbps).
  - New Logic:
    - If `videoCodec === 'copy'`: Use `targetBitrate` if provided (fallback to `autoBitrate`). Do NOT apply the 25Mbps floor.
    - Else (Re-encoding): Keep existing logic (force >= 25Mbps to ensure visually lossless intermediate).

- **Pseudo-Code**:
  ```typescript
  // packages/renderer/src/strategies/CanvasStrategy.ts

  let targetBitrate = 0;
  if (options.videoBitrate) {
    targetBitrate = parseBitrate(options.videoBitrate);
  }

  const fps = options.fps || 60;
  const autoBitrate = Math.floor(width * height * fps * 0.2); // 0.2 bpp

  let intermediateBitrate: number;

  if (options.videoCodec === 'copy') {
      // In copy mode, the intermediate stream IS the final output.
      // Respect the user's request strictly.
      // If no bitrate is specified, default to autoBitrate (high quality).
      intermediateBitrate = targetBitrate > 0 ? targetBitrate : autoBitrate;
  } else {
      // In transcoding mode, the intermediate stream is temporary.
      // We enforce a high bitrate floor (25Mbps) to prevent generation loss
      // before the final FFmpeg encoding pass.
      intermediateBitrate = Math.max(25_000_000, targetBitrate, autoBitrate);
  }
  ```

- **Dependencies**: None.

## 4. Test Plan
- **Verification Script**: `packages/renderer/tests/verify-copy-bitrate.ts`
  - **Setup**:
    - Mock `VideoEncoder` in Playwright.
    - Initialize `CanvasStrategy` with `videoCodec: 'copy'`, `videoBitrate: '1M'`, `width: 1920`, `height: 1080`.
  - **Action**: Call `prepare(page)`.
  - **Assert**: Check that the `bitrate` passed to `VideoEncoder.configure` is exactly 1,000,000 (1Mbps), NOT 25,000,000.
  - **Run**: `npx tsx packages/renderer/tests/verify-copy-bitrate.ts`
- **Regression Check**: Run `npx tsx packages/renderer/tests/verify-bitrate.ts` to ensure standard behavior (clamping to 25Mbps for non-copy modes) is preserved.
- **Success Criteria**:
  - `verify-copy-bitrate.ts` passes (prints ✅).
  - `verify-bitrate.ts` passes (prints ✅).
