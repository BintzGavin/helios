#### 1. Context & Goal
- **Objective**: Update `FFmpegBuilder` to support `videoCodec: 'copy'` (Stream Copy) by conditionally omitting incompatible encoding flags.
- **Trigger**: Current `FFmpegBuilder` implementation blindly appends `-pix_fmt`, `-crf`, and `-b:v` even when the user requests `copy`, causing FFmpeg to fail or re-encode inefficiently.
- **Impact**: Unlocks the "Dual-Path Architecture" promise of high-performance rendering by allowing H.264 streams from WebCodecs to be piped directly to the output container without CPU-intensive re-encoding.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/utils/FFmpegBuilder.ts` (Add logic to skip encoding flags for `copy` codec)
- **Create**: `packages/renderer/tests/verify-stream-copy.ts` (Unit test for FFmpeg args generation)
- **Read-Only**: `packages/renderer/src/types.ts` (Reference for options)

#### 3. Implementation Spec
- **Architecture**:
  - The `FFmpegBuilder` will act as a "smart builder" that respects the "Stream Copy" intent.
  - When `options.videoCodec` is exactly `'copy'`, the builder switches to a "Passthrough Mode" for video arguments.
- **Pseudo-Code**:
  - IN `FFmpegBuilder.getArgs`:
    - GET `videoCodec` from options (default to `libx264`).
    - IF `videoCodec` IS `'copy'`:
      - SET `encodingArgs` to `['-c:v', 'copy']`.
      - DO NOT append `-pix_fmt`.
      - DO NOT append `-crf`, `-preset`, or `-b:v`.
      - KEEP `-movflags +faststart` (valid for MP4 container).
    - ELSE:
      - SET `encodingArgs` to `['-c:v', videoCodec]`.
      - APPEND `-pix_fmt`, `-crf`, `-preset`, `-b:v` as per existing logic.
    - RETURN combined arguments (including audio args).
- **Public API Changes**: None (Existing `videoCodec` string option supports `'copy'` value).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx ts-node packages/renderer/tests/verify-stream-copy.ts`
- **Success Criteria**:
  - The test instantiates `FFmpegBuilder` with `{ videoCodec: 'copy' }`.
  - The returned args array MUST contain `'-c:v', 'copy'`.
  - The returned args array MUST NOT contain `'-pix_fmt'`, `'-crf'`, `'-preset'`, or `'-b:v'`.
  - The test also instantiates with default options and confirms standard flags ARE present.
- **Edge Cases**:
  - Verify that `audioTracks` (audio mixing) still generates correct audio filters (audio is re-encoded to AAC by default, which is compatible with video stream copy).
