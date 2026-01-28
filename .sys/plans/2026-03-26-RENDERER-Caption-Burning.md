# 2026-03-26-RENDERER-Caption-Burning.md

#### 1. Context & Goal
- **Objective**: Implement "Caption Burning" by supporting an optional `.srt` file path in `RendererOptions` that is burned into the video using FFmpeg.
- **Trigger**: This feature is documented in the Vision (README) and marked as completed in Status 1.25.0, but is missing from the codebase (Vision Gap).
- **Impact**: Enables users to add hardcoded subtitles to their videos, a core requirement for video generation.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/types.ts` (Add `subtitles` option).
- **Modify**: `packages/renderer/src/utils/FFmpegBuilder.ts` (Refactor to support video filtering and subtitle injection).
- **Create**: `packages/renderer/tests/verify-captions.ts` (Verification script).

#### 3. Implementation Spec
- **Architecture**:
    - Update `FFmpegBuilder` to separate filter graph construction from argument assembly.
    - Implement a "Dual-Chain" filter logic: one chain for audio (existing), one for video (new, for subtitles).
    - Merge chains into a single `-filter_complex` argument.
- **Pseudo-Code**:
    - **types.ts**:
        - ADD `subtitles?: string;` to `RendererOptions` interface.
    - **FFmpegBuilder.ts**:
        - REF `getArgs`:
            - INITIALIZE `videoFilterChain` = empty list.
            - IF `options.subtitles`:
                - ASSERT `options.videoCodec` != 'copy' (Throw error if true).
                - ESCAPE `options.subtitles` (replace `\` -> `/`, `:` -> `\:`, `'` -> `\'`).
                - APPEND `[0:v]subtitles='${path}'[vout]` to `videoFilterChain`.
                - SET `videoMap` = `[vout]`.
            - ELSE:
                - SET `videoMap` = `0:v`.

            - IF `audioTracks` exists:
                - BUILD `audioFilterChain` (existing logic).
                - SET `audioMap` = `[aout]` (or similar).

            - COMBINE filters:
                - IF `videoFilterChain` AND `audioFilterChain`: `filterComplex` = `${videoFilterChain};${audioFilterChain}`.
                - ELSE IF `videoFilterChain`: `filterComplex` = `videoFilterChain`.
                - ELSE IF `audioFilterChain`: `filterComplex` = `audioFilterChain`.

            - CONSTRUCT args:
                - IF `filterComplex`: PUSH `-filter_complex`, `filterComplex`.
                - PUSH `-map`, `videoMap`.
                - IF audio: PUSH `-map`, `audioMap`.
                - APPEND encoding args and output path.

- **Public API Changes**:
    - `RendererOptions`: Added `subtitles` property.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npx ts-node packages/renderer/tests/verify-captions.ts`.
- **Success Criteria**:
    - The verification script prints "Verification Passed".
    - Argument generation logic is verified for:
        - Subtitles only.
        - Subtitles + Audio.
        - Subtitles + Copy Codec (Error).
        - Path escaping (Windows paths).
- **Edge Cases**:
    - Windows paths with backslashes.
    - Filenames with quotes or colons.
    - No audio tracks present (ensure `-map` is correct).
- **Pre-Commit**: Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
