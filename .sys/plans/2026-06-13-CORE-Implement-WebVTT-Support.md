# 2026-06-13-CORE-Implement-WebVTT-Support

## 1. Context & Goal
- **Objective**: Implement `parseWebVTT` and `parseCaptions` factory to support WebVTT caption format in `Helios`.
- **Trigger**: The Vision ("Leverage Web Standards") requires support for standard web formats like WebVTT, but currently only SRT is supported.
- **Impact**: Enables users to use native `.vtt` files directly in Helios, aligning with browser standards and the "Native Always Wins" philosophy.

## 2. File Inventory
- **Create**: None.
- **Modify**:
  - `packages/core/src/captions.ts`: Implement `parseWebVTT` and `parseCaptions`.
  - `packages/core/src/Helios.ts`: Update usage to `parseCaptions`.
  - `packages/core/src/errors.ts`: Add `INVALID_WEBVTT_FORMAT` error code.
  - `packages/core/src/captions.test.ts`: Add WebVTT test cases.
- **Read-Only**: `packages/core/src/index.ts` (exports should remain stable).

## 3. Implementation Spec
- **Architecture**:
  - Add `parseWebVTT` utility following similar logic to `parseSrt` but with WebVTT specific parsing (Header, `.` vs `,` timecodes).
  - Create `parseCaptions(content: string)` that detects format (starts with `WEBVTT`) and dispatches to appropriate parser.
  - Refactor `Helios.ts` to use `parseCaptions` in constructor and `setCaptions`.
- **Pseudo-Code**:
  ```typescript
  function parseWebVTT(content) {
    if (!content.trim().startsWith('WEBVTT')) throw Error;
    // ... parse blocks ...
  }

  function parseCaptions(content) {
    if (content.trim().startsWith('WEBVTT')) return parseWebVTT(content);
    return parseSrt(content);
  }
  ```
- **Public API Changes**:
  - Export `parseWebVTT`.
  - Export `parseCaptions`.
  - `Helios.setCaptions` now accepts WebVTT strings.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `captions.test.ts` passes with new WebVTT cases.
  - `index.test.ts` passes (regression check).
  - `Helios` correctly parses WebVTT input.
- **Edge Cases**:
  - Invalid WebVTT format (missing header, bad timecodes).
  - Mixed formats (should fail or strictly detect).
