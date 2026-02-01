# 2026-06-20-PLAYER-WebVTT-Support.md

#### 1. Context & Goal
- **Objective**: Implement WebVTT caption parsing support in `<helios-player>` to ensure compatibility with standard `<track>` usage.
- **Trigger**: Vision gap in "Standard Media API" parity; currently only SRT is supported, but the web standard is WebVTT.
- **Impact**: Enables users to use standard `.vtt` caption files with Helios Player, improving interoperability and "drop-in" usability.

#### 2. File Inventory
- **Create**:
  - `packages/player/src/features/caption-parser.ts` (Refactored from `srt-parser.ts`)
  - `packages/player/src/features/caption-parser.test.ts` (Refactored from `srt-parser.test.ts`)
- **Modify**:
  - `packages/player/src/index.ts` (Update import and usage)
  - `packages/player/src/features/exporter.ts` (Update import)
- **Delete**:
  - `packages/player/src/features/srt-parser.ts` (Replaced by `caption-parser.ts`)
  - `packages/player/src/features/srt-parser.test.ts` (Replaced by `caption-parser.test.ts`)
- **Read-Only**:
  - `packages/player/src/features/text-tracks.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Refactor `srt-parser.ts` into a generic `caption-parser.ts` module.
  - Implement a `parseCaptions(content: string): SubtitleCue[]` function that automatically detects the format (SRT vs WebVTT).
  - Implement `parseWebVTT` logic to handle VTT specifics:
    - Skip `WEBVTT` header and metadata headers.
    - Support timestamps with dots (`.`) as per WebVTT spec (e.g., `00:00:01.000`).
    - Support timestamps without hours (e.g., `00:01.000`).
  - Retain `parseSRT` logic for backward compatibility and explicit SRT support.
  - Expose `stringifySRT` (or `stringifyCaptions`) for the Exporter.
- **Pseudo-Code**:
  ```typescript
  export function parseCaptions(content: string): SubtitleCue[] {
    const trimmed = content.trim();
    if (trimmed.startsWith("WEBVTT")) {
      return parseWebVTT(content);
    }
    return parseSRT(content);
  }

  function parseWebVTT(content: string): SubtitleCue[] {
    // 1. Normalize line endings
    // 2. Split by double newlines to get blocks
    // 3. Skip the first block if it's just the header
    // 4. Iterate blocks:
    //    - Look for timestamp line: "00:00.000 --> 00:04.000"
    //    - Regex: /((?:\d{2}:)?\d{2}:\d{2}[.,]\d{3})\s*-->\s*((?:\d{2}:)?\d{2}:\d{2}[.,]\d{3})/
    //    - Parse start/end times (handling optional hours)
    //    - Extract text
    //    - Ignore blocks that look like metadata/styles/regions for now
    // 5. Return cues
  }

  function parseTime(timeString: string): number {
    // Split by ':'
    // If 3 parts: H:M:S
    // If 2 parts: M:S
    // Handle . or , for milliseconds
  }
  ```
- **Public API Changes**:
  - Internal refactor of `packages/player`.
  - `HeliosPlayer` behavior change: Now supports VTT content in `<track src="...">`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/player` to ensure no regressions.
- **Success Criteria**:
  - Existing SRT tests pass (moved to new test file).
  - New WebVTT tests pass:
    - Standard VTT with header.
    - VTT with `.` timestamps.
    - VTT with `MM:SS.mmm` (no hours) timestamps.
    - VTT with optional cue identifiers.
- **Edge Cases**:
  - Malformed VTT files (should be robust or return empty).
  - Mixed formats (detection should rely on header).
  - Empty files.
