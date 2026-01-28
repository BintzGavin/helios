# RENDERER: Implement Caption Burning

## 1. Context & Goal
- **Objective**: Implement `subtitles` support in `RendererOptions` and `FFmpegBuilder` to allow burning captions (SRT) into the video.
- **Trigger**: Vision Gap. The Status file claimed this feature was completed in [1.25.0], but codebase analysis reveals no implementation of the `subtitles` filter or options.
- **Impact**: Enables users to render videos with hard-coded subtitles, a critical feature for social media content.

## 2. File Inventory
- **Modify**: `packages/renderer/src/types.ts` (Add `subtitles` option)
- **Modify**: `packages/renderer/src/utils/FFmpegBuilder.ts` (Add FFmpeg filter logic)
- **Create**: `packages/renderer/tests/verify-captions.ts` (Verification script)

## 3. Implementation Spec

### Architecture
- Updates `RendererOptions` to accept a `subtitles` file path.
- Updates `FFmpegBuilder` to conditionally inject the `subtitles` video filter.
- Enforces a constraint: Subtitle burning requires re-encoding, so it must throw an error if `videoCodec` is set to `'copy'`.
- Handles platform-specific path escaping for FFmpeg filters.

### Pseudo-Code

#### `packages/renderer/src/types.ts`
```typescript
interface RendererOptions {
  // ... existing options
  /**
   * Path to a subtitle file (e.g., .srt) to burn into the video.
   * Note: This requires re-encoding and cannot be used with videoCodec: 'copy'.
   */
  subtitles?: string;
}
```

#### `packages/renderer/src/utils/FFmpegBuilder.ts`
```typescript
// Helper function for escaping paths in FFmpeg filters
FUNCTION escapeFilterPath(path):
    replaced = path.replace all '\' with '/'
    replaced = replaced.replace all ':' with '\:'
    RETURN replaced

// Inside getArgs method...
IF options.subtitles IS DEFINED:
    IF options.videoCodec IS 'copy':
        THROW Error("Cannot burn subtitles when videoCodec is 'copy'. Please use a specific codec (e.g., 'libx264').")

    escapedPath = escapeFilterPath(options.subtitles)
    // Add subtitle filter to video encoding args
    // We append to encodingArgs or insert a -vf flag
    // Currently FFmpegBuilder constructs `encodingArgs`.
    // We need to ensure -vf is added.

    // Note: If other video filters exist, we must combine them.
    // Current implementation:
    // encodingArgs.push('-pix_fmt', ...)

    filterString = `subtitles='${escapedPath}'`
    encodingArgs.push('-vf', filterString)

```

## 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-captions.ts`
- **Success Criteria**:
    1.  Test script instantiates `FFmpegBuilder` with `subtitles: 'test.srt'`.
    2.  Asserts that output args contain `-vf subtitles='test.srt'` (with appropriate escaping).
    3.  Instantiates with `subtitles` AND `videoCodec: 'copy'`.
    4.  Asserts that it throws an Error.
- **Edge Cases**:
    - Windows paths with backslashes (`C:\path\to\file.srt`) -> should be escaped to `C\:/path/to/file.srt`.
    - Paths with spaces -> wrapped in quotes (handled by the single quotes in `subtitles='...'`).
