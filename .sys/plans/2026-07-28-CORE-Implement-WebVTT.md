# Plan: Implement WebVTT Caption Support

## 1. Context & Goal
- **Objective**: Implement native WebVTT (.vtt) parsing and automatic format detection for captions.
- **Trigger**: The README lists "Captions/subtitles" as a key feature and "Use Web Standards" as a principle. Currently only SRT is supported. WebVTT is the standard for web video (`<track>` element).
- **Impact**: Enables developers to use standard WebVTT files directly with Helios, closing a feature gap and improving the "Captions/subtitles" capability from "Basic" to "Standard".

## 2. File Inventory
- **Modify**: `packages/core/src/captions.ts`
  - Add `parseWebVTT` function.
  - Add `parseCaptions` factory function.
  - Export both.
- **Modify**: `packages/core/src/Helios.ts`
  - Update constructor and `setCaptions` to use `parseCaptions` instead of `parseSrt`.
- **Modify**: `packages/core/src/errors.ts`
  - Add `INVALID_WEBVTT_FORMAT` to `HeliosErrorCode`.
- **Modify**: `packages/core/src/captions.test.ts`
  - Add test suite for `parseWebVTT`.
  - Add test suite for `parseCaptions` (format detection).

## 3. Implementation Spec
- **Architecture**: Factory pattern. `parseCaptions(content)` inspects the content header to determine the parser (WebVTT vs SRT).
- **Pseudo-Code**:
  ```typescript
  // packages/core/src/captions.ts

  export function parseWebVTT(content: string): CaptionCue[] {
    const normalized = content.replace(/\r\n/g, '\n').trim();
    // 1. Check Header
    if (!normalized.startsWith('WEBVTT')) {
      throw new HeliosError(INVALID_WEBVTT_FORMAT, "Missing WEBVTT header");
    }

    // 2. Split into blocks (double newline)
    const blocks = normalized.split(/\n\n+/).slice(1); // Skip header

    return blocks.map(block => {
      // 3. Parse each block
      // - Ignore "NOTE" blocks
      // - Optional ID line
      // - Timestamps: HH:MM:SS.mmm OR MM:SS.mmm (Dot separator)
      // - Optional settings (align:start line:0%) -> Ignore for now
      // - Text payload
    });
  }

  export function parseCaptions(content: string): CaptionCue[] {
    const trimmed = content.trim();
    if (trimmed.startsWith('WEBVTT')) {
      return parseWebVTT(trimmed);
    }
    // Default to SRT for backward compatibility or if it looks like SRT
    return parseSrt(trimmed);
  }
  ```
- **Public API Changes**:
  - `parseWebVTT` and `parseCaptions` are exported.
  - `Helios` class now accepts WebVTT strings in `captions` option and `setCaptions`.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `captions.test.ts` passes all new tests.
  - `parseWebVTT` handles valid WebVTT (header, timestamps with dots).
  - `parseCaptions` correctly routes VTT content to VTT parser and SRT content to SRT parser.
- **Edge Cases**:
  - WebVTT with `NOTE` comments (should be ignored).
  - WebVTT with settings (e.g. `00:00.000 --> 00:05.000 align:start`).
  - Timestamps without hours (`MM:SS.mmm`).
