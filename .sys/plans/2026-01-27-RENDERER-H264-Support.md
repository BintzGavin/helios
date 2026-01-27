#### 1. Context & Goal
- **Objective**: Implement H.264 (Annex B) output support in `CanvasStrategy` to allow hardware-accelerated encoding and direct stream copy for MP4 outputs.
- **Trigger**: Vision Gap (Performance/Efficiency). Currently `CanvasStrategy` forces VP8/VP9/AV1 (IVF), requiring re-encoding for MP4.
- **Impact**: Enables significantly faster rendering for MP4 outputs by bypassing FFmpeg re-encoding. Unlocks hardware encoders on consumer devices.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/strategies/CanvasStrategy.ts` (Implement H.264 logic)
- **Create**: `packages/renderer/tests/verify-h264.ts` (Verification script)
- **Read-Only**: `packages/renderer/src/utils/FFmpegBuilder.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Extend `CanvasStrategy` to support `h264` and `avc1` in `intermediateVideoCodec`.
  - Implement a conditional path in `prepare()` to select between IVF (VP8/VP9/AV1) and Annex B (H.264) container formats.
  - The H.264 path must convert WebCodecs `avc` format (length-prefixed AVCC) to Annex B (Start Codes) for compatibility with FFmpeg's `h264` demuxer.

- **Pseudo-Code (CanvasStrategy.prepare)**:
  - DETERMINE `codecString` based on options (handle `h264`, `avc1` aliases).
  - CHECK `VideoEncoder.isConfigSupported()`. IF not supported, fallback to `toDataURL`.
  - IF codec is H.264:
    - INIT `window.heliosWebCodecs.chunks`.
    - CREATE `VideoEncoder` with `output` callback:
      - GET `chunk` and `metadata`.
      - IF `metadata.decoderConfig.description` exists (Configuration Record):
        - PARSE AVCC (skip version/profile/level/lengthSize).
        - EXTRACT SPS count and SPS NALs.
        - EXTRACT PPS count and PPS NALs.
        - FOR EACH SPS/PPS:
          - WRITE Start Code (`00 00 00 01`).
          - WRITE NAL unit.
          - PUSH to `chunks`.
      - CONVERT Chunk Data (AVCC to Annex B):
        - READ buffer.
        - WHILE offset < length:
          - READ NAL length (4 bytes big-endian).
          - WRITE Start Code (`00 00 00 01`) replacing length prefix.
          - COPY NAL payload.
          - PUSH to `chunks`.
    - CONFIGURE encoder.
  - ELSE (VP8/VP9/AV1):
    - USE existing IVF header/frame logic.

- **Pseudo-Code (CanvasStrategy.getFFmpegArgs)**:
  - IF using H.264:
    - RETURN `['-f', 'h264', '-i', '-']`.
  - ELSE:
    - RETURN `['-f', 'ivf', '-i', '-']`.

- **Pseudo-Code (verify-h264.ts)**:
  - IMPORT `CanvasStrategy`.
  - INSTANTIATE with `intermediateVideoCodec: 'h264'`.
  - ASSERT `getFFmpegArgs` contains `-f h264`.
  - MOCK `page.evaluate` to simulate `VideoEncoder` check returning true.
  - CALL `prepare(page)`.
  - VERIFY `console.log` indicates "Using WebCodecs (h264)".

#### 4. Test Plan
- **Verification**: `npx ts-node packages/renderer/tests/verify-h264.ts`
- **Success Criteria**:
  - `CanvasStrategy` correctly selects H.264 mode when requested.
  - FFmpeg arguments match the `h264` demuxer format.
  - No regression for existing IVF codecs (VP8/VP9).
- **Edge Cases**:
  - `avc1` vs `h264` string handling.
  - Browser support missing (should fallback to canvas/png).
