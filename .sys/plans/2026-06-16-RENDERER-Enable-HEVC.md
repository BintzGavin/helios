# 2026-06-16-RENDERER-Enable-HEVC.md

#### 1. Context & Goal
- **Objective**: Enable HEVC (H.265) support in `CanvasStrategy` using WebCodecs.
- **Trigger**: Vision "Smart Codec Selection" and "High Performance". HEVC is currently unsupported despite being a standard, high-efficiency codec available on modern hardware (e.g., Apple Silicon, Windows).
- **Impact**: Unlocks hardware-accelerated HEVC encoding, offering better compression and quality than H.264 for `CanvasStrategy` users on supported platforms.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/strategies/CanvasStrategy.ts` (Add HEVC detection, configuration, and FFmpeg args)
- **Create**: `packages/renderer/tests/verify-hevc.ts` (Verification script)

#### 3. Implementation Spec
- **Architecture**: Extend `CanvasStrategy` to treat HEVC (`hvc1`, `hev1`) similarly to H.264 (using Annex B format and skipping the IVF container), as FFmpeg expects raw HEVC streams when using `-f hevc`.
- **Pseudo-Code**:
  - **In `diagnose(page)`**:
    - Add a test configuration for HEVC (e.g., `hvc1.1.6.L93.B0` - Main Profile, Level 3.1) to the `configs` array.
  - **In `prepare(page)`**:
    - Update `addCandidate` logic to recognize `hvc1` and `hev1` prefixes.
    - Introduce a flag `isAnnexB` (or `isHevc`) alongside `isH264`.
    - If the selected codec is HEVC:
      - Set `encoderConfig.hevc = { format: 'annexb' }` (instead of `avc`).
      - Skip the IVF File Header generation (same as H.264).
    - Update the `VideoEncoder` output callback to skip IVF Frame Headers if the codec is HEVC (same as H.264).
    - Log "Using WebCodecs (HEVC)...".
  - **In `getFFmpegArgs`**:
    - Update logic to check if `useHevc` (or similar state) is true.
    - If true, set `videoInputArgs` to `['-f', 'hevc', '-i', '-']`.
- **Public API Changes**: None. `intermediateVideoCodec` option will now accept `hvc1...` strings.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx ts-node packages/renderer/tests/verify-hevc.ts`
- **Success Criteria**:
  - The script should successfully detect HEVC support (if available on the host machine/browser).
  - If supported, it should configure `CanvasStrategy` with HEVC.
  - FFmpeg should be spawned with `-f hevc` arguments.
  - A valid video file should be produced.
- **Edge Cases**:
  - **Browser unsupported**: The test should verify that `CanvasStrategy` falls back to the next candidate (e.g., VP8) or throws an error if HEVC was explicitly requested.
  - **FFmpeg unsupported**: `FFmpegInspector` (already implemented) ensures we know capabilities, but we assume the bundled FFmpeg supports HEVC decoding.
