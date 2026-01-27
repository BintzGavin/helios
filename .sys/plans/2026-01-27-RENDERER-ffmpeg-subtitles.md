# 2026-01-27-RENDERER-ffmpeg-subtitles

## 1. Context & Goal
- **Objective**: Enable hard-coding (burning) of subtitles into the output video via FFmpeg.
- **Trigger**: The `CanvasStrategy` (WebCodecs) only captures the `<canvas>` element, effectively dropping any DOM-based overlays like subtitles. The Vision requires "Captions export (burned-in)", and since `CanvasStrategy` cannot see the DOM, we must rely on FFmpeg's `subtitles` filter to composite them post-capture.
- **Impact**: Unlocks the ability to render subtitled videos using the high-performance `CanvasStrategy`, fulfilling the "Captions & Audio" roadmap item.

## 2. File Inventory
- **Modify**: `packages/renderer/src/types.ts` (Add `subtitlesPath` to `RendererOptions`)
- **Modify**: `packages/renderer/src/utils/FFmpegBuilder.ts` (Implement `subtitles` filter logic with path escaping)
- **Create**: `packages/renderer/tests/verify-subtitles.ts` (Verification script)

## 3. Implementation Spec

### Architecture
- **Filter Injection**: We will inject the `subtitles` filter into the FFmpeg video filter chain (`-vf`).
- **Path Sanitization**: FFmpeg's filter graph syntax has strict escaping rules, especially on Windows. We must normalize paths (forward slashes) and escape drive letter colons (e.g., `C:` becomes `C\:`).
- **Validation**: If `videoCodec` is set to `'copy'`, we must throw an error because filters require re-encoding.

### Pseudo-Code

#### `packages/renderer/src/types.ts`
- ADD `subtitlesPath?: string` to `RendererOptions`.

#### `packages/renderer/src/utils/FFmpegBuilder.ts`
- IN `getArgs`:
  - IF `options.subtitlesPath` IS DEFINED:
    - IF `videoCodec` IS `'copy'`:
      - THROW Error("Cannot burn subtitles with 'videoCodec: copy'.")
    - SANITIZE `subtitlesPath`:
      - Resolve to absolute path using `path.resolve`.
      - Replace all `\` with `/`.
      - IF Windows (path contains `:` at index 1): Escape `:` to `\:`.
    - CONSTRUCT filter string: `subtitles='${sanitizedPath}'`
    - APPEND to video args:
      - IF existing `-vf` or `-filter_complex`: (Not applicable for basic setup, but be careful).
      - FFmpegBuilder usually constructs basic args.
      - We should append it to the video filter chain.
      - Currently `FFmpegBuilder` adds encoding args directly.
      - We need to add `-vf subtitles='...'` BEFORE output path and AFTER input.
      - NOTE: `subtitles` filter is a simple video filter.
  - RETURN updated args list.

## 4. Test Plan
- **Verification**: `npx ts-node packages/renderer/tests/verify-subtitles.ts`
- **Script Logic**:
  1. Create a dummy `test.srt` file with simple content.
  2. Instantiate `Renderer` with `mode: 'canvas'`, `videoCodec: 'libx264'`, and `subtitlesPath: 'test.srt'`.
  3. Render a 1-second video (30 frames).
  4. Verify the process exits with code 0.
  5. (Optional) Check stdout/stderr for `subtitles` filter usage.
- **Edge Cases**:
  - Windows paths (`C:\Foo\Bar.srt`).
  - Relative paths (should be resolved).
  - Compatibility check with `videoCodec: 'copy'` (should throw).
