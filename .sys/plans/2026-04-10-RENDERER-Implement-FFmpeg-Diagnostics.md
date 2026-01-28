# Context & Goal
- **Objective**: Implement comprehensive FFmpeg diagnostics in `Renderer.diagnose()` to verify environment readiness.
- **Trigger**: Vision Gap - `README.md` promises "Built-in tools to verify... FFmpeg version", but current code only checks browser capabilities.
- **Impact**: Enables users and CI/CD to verify that the FFmpeg environment is correctly configured (version, codecs, filters) before starting a render, preventing obscure runtime failures.

# File Inventory
- **Create**: `packages/renderer/src/utils/FFmpegInspector.ts` (New utility for FFmpeg probing)
- **Create**: `packages/renderer/tests/verify-diagnose-ffmpeg.ts` (Verification script)
- **Modify**: `packages/renderer/src/Renderer.ts` (Integrate inspector into diagnose method)
- **Modify**: `packages/renderer/tests/run-all.ts` (Add new test to suite)
- **Read-Only**: `packages/renderer/src/strategies/RenderStrategy.ts`

# Implementation Spec
- **Architecture**:
  - The `FFmpegInspector` class acts as a standalone probe that executes the FFmpeg binary with information flags (`-version`, `-encoders`, `-filters`).
  - The `Renderer` class orchestrates the diagnostics by running the Strategy diagnostics (Browser) and the Inspector diagnostics (System) in parallel.
  - The return type of `Renderer.diagnose()` is expanded to include an `ffmpeg` key.

- **Pseudo-Code**:
  - **FFmpegInspector**:
    - FUNCTION inspect(ffmpegPath):
      - SET info = { path: ffmpegPath, present: false, version: null, encoders: [], filters: [] }
      - TRY:
        - CALL spawn(ffmpegPath, ['-version']) -> CAPTURE stdout
        - SET info.present = true
        - SET info.version = parse_first_line(stdout)

        - CALL spawn(ffmpegPath, ['-encoders']) -> CAPTURE stdout
        - PARSE stdout lines:
          - IF line contains "V....." (Video Encoder):
             - EXTRACT encoder_name (e.g. "libx264")
             - ADD to info.encoders

        - CALL spawn(ffmpegPath, ['-filters']) -> CAPTURE stdout
        - PARSE stdout lines:
           - EXTRACT filter_name
           - ADD to info.filters
      - CATCH Error:
        - RETURN info (with present=false)
      - RETURN info

  - **Renderer**:
    - METHOD diagnose():
      - CALL super or setup browser (existing logic)
      - CALL strategy.diagnose(page) -> SET browser_diagnostics
      - CALL FFmpegInspector.inspect(this.options.ffmpegPath) -> SET ffmpeg_diagnostics
      - RETURN { browser: browser_diagnostics, ffmpeg: ffmpeg_diagnostics }

- **Public API Changes**:
  - `Renderer.diagnose()` return type changes structure. (Note: It returns `Promise<any>` so strictly speaking no TS error, but runtime shape changes).

- **Dependencies**:
  - None.

# Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-diagnose-ffmpeg.ts && npx tsx packages/renderer/tests/run-all.ts`
- **Success Criteria**:
  - `verify-diagnose-ffmpeg.ts` logs the full diagnostics object.
  - The object contains `ffmpeg.version` (string).
  - The object contains `ffmpeg.encoders` which includes 'libx264'.
  - The object contains `ffmpeg.filters` which includes 'subtitles'.
  - `run-all.ts` passes with exit code 0.
- **Edge Cases**:
  - If FFmpeg is missing (simulated by passing invalid path), `present` should be false and no crash should occur.
