# 2026-09-14-RENDERER-FFmpeg-Hardware-Acceleration.md

#### 1. Context & Goal
- **Objective**: Implement hardware acceleration detection in `FFmpegInspector` AND support for configurable `-hwaccel` flag in `FFmpegBuilder`.
- **Trigger**: Vision gap identified. The previous plan `2026-09-13` (Detection) was not implemented, and usage support (`FFmpegBuilder`) is missing.
- **Impact**: Enables users to leverage GPU for faster rendering, especially in distributed workflows. Provides visibility via `renderer.diagnose()`.

#### 2. File Inventory
- **Modify**:
  - `packages/renderer/src/utils/FFmpegInspector.ts`: Add `hwaccels` detection logic.
  - `packages/renderer/src/types.ts`: Add `hwAccel` option to `RendererOptions`.
  - `packages/renderer/src/utils/FFmpegBuilder.ts`: Inject `-hwaccel` flag based on options.
  - `packages/renderer/tests/verify-diagnose-ffmpeg.ts`: Update to verify `hwaccels` detection.
- **Create**:
  - `packages/renderer/tests/verify-hwaccel-args.ts`: New test to verify correct argument generation.
- **Read-Only**:
  - `packages/renderer/src/Renderer.ts` (Reference for `diagnose` flow)

#### 3. Implementation Spec
- **Architecture**:
  - Extend `FFmpegInspector` to spawn `ffmpeg -hwaccels` and parse the output.
  - Update `RendererOptions` to include an optional `hwAccel` property.
  - Update `FFmpegBuilder` to inject the `-hwaccel` flag before the input file (`-i`) when configured.
- **Public API Changes**:
  - `FFmpegDiagnostics` interface in `FFmpegInspector.ts`: Add `hwaccels: string[]`.
  - `RendererOptions` interface in `types.ts`: Add `hwAccel?: 'auto' | 'cuda' | 'dr' | 'vaapi' | 'qsv' | 'videotoolbox' | string;`.
- **Logic Flow**:
  1. **Detection (`FFmpegInspector`)**:
     - Spawn `ffmpeg -hwaccels`.
     - Capture **stdout**.
     - Parse output: Skip the first line ("Hardware acceleration methods:"), split by newline, trim, filter empty lines.
     - Add resulting list to `result.hwaccels`.
  2. **Configuration (`FFmpegBuilder`)**:
     - In `getArgs`: Check `options.hwAccel`.
     - If present, create `hwAccelArgs = ['-hwaccel', options.hwAccel]`.
     - Prepend `hwAccelArgs` to `finalArgs` *before* `videoInputArgs` (which contains `-i`).
     - Ensure correct order: `['-y', ...hwAccelArgs, ...videoInputArgs, ...audioInputArgs]`.

#### 4. Test Plan
- **Verification**:
  - Run `npx tsx packages/renderer/tests/verify-diagnose-ffmpeg.ts` to confirm detection works with local FFmpeg (should list `vdpau`, `vaapi`).
  - Run `npx tsx packages/renderer/tests/verify-hwaccel-args.ts` to confirm arguments are generated correctly.
- **Success Criteria**:
  - `verify-diagnose-ffmpeg.ts` passes and logs detected accelerators (assert `diagnostics.ffmpeg.hwaccels` is array).
  - `verify-hwaccel-args.ts` confirms `-hwaccel cuda` (or other values) appears before `-i` in the argument list.
- **Edge Cases**:
  - Empty/Unsupported `hwaccels` output from FFmpeg (should return empty array).
  - `hwAccel` option provided but empty string (should be ignored).
  - FFmpeg version differences in `-hwaccels` output format (handle robustly).
