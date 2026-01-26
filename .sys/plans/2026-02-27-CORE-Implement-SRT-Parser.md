# Spec: Implement SRT Parser in Core

## 1. Context & Goal
- **Objective**: Implement a pure TypeScript SRT (SubRip Subtitle) parser and serializer.
- **Trigger**: Vision Gap - Roadmap V1.x lists "Caption/subtitle import (SRT)" and "Caption export" as planned features.
- **Impact**: Enables developers to import and manage subtitles in their video compositions, a critical feature for accessibility and modern video content. This moves `packages/core` closer to the V1.x vision.

## 2. File Inventory
- **Create**:
  - `packages/core/src/captions.ts`: Implementation of `parseSrt` and `stringifySrt`.
  - `packages/core/src/captions.test.ts`: Unit tests for the parser and serializer.
- **Modify**:
  - `packages/core/src/index.ts`: Export the new `captions` module.
- **Read-Only**:
  - `packages/core/src/errors.ts`: To use `HeliosError` for parsing errors.

## 3. Implementation Spec
- **Architecture**:
  - Functional utility module.
  - `parseSrt` accepts a raw SRT string and returns an array of `CaptionCue` objects.
  - `stringifySrt` accepts an array of `CaptionCue` objects and returns a formatted SRT string.
  - Timestamps will be stored as **milliseconds** (number) to preserve precision and match SRT's native format.
- **Pseudo-Code**:
  ```typescript
  interface CaptionCue {
    id: string;
    startTime: number; // in milliseconds
    endTime: number;   // in milliseconds
    text: string;
  }

  function parseSrt(content: string): CaptionCue[] {
    // 1. Normalize line endings (\r\n -> \n)
    // 2. Split by double newline (\n\n) to get blocks
    // 3. For each block:
    //    a. Parse ID (optional but recommended)
    //    b. Parse Timecode line: "HH:MM:SS,mmm --> HH:MM:SS,mmm"
    //       - Throw HeliosError if invalid format
    //    c. Parse Text (remaining lines)
    // 4. Return array of CaptionCue
  }

  function stringifySrt(cues: CaptionCue[]): string {
    // 1. Map cues to string blocks
    //    - Format time to "HH:MM:SS,mmm"
    //    - Join with newlines
    // 2. Join blocks with double newlines
  }
  ```
- **Public API Changes**:
  - Export `CaptionCue` interface.
  - Export `parseSrt` and `stringifySrt` functions.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `parseSrt` correctly parses a standard SRT sample.
  - `parseSrt` handles edge cases (whitespace, missing IDs, multi-line text).
  - `stringifySrt` generates valid SRT output.
  - Round-trip test (`parseSrt` -> `stringifySrt` -> `parseSrt`) preserves data.
- **Edge Cases**:
  - Malformed timestamps (throw `HeliosError`).
  - Empty file (return empty array).
  - Mixed line endings.
