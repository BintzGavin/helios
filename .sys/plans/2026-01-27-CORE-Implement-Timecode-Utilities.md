# Spec: Implement Timecode Utilities

## 1. Context & Goal
- **Objective**: Implement standardized timecode formatting (SMPTE style `HH:MM:SS:FF`) and parsing utilities in `packages/core`.
- **Trigger**: "Headless Logic Engine" vision gap; video creation tools require consistent timecode display but currently lack a shared utility.
- **Impact**: Enables consistent time representation across `packages/studio` (timeline), `packages/player`, and user compositions, improving DX for video-centric workflows.

## 2. File Inventory
- **Create**:
  - `packages/core/src/timecode.ts`: Implementation of timecode logic.
  - `packages/core/src/timecode.test.ts`: Unit tests.
- **Modify**:
  - `packages/core/src/errors.ts`: Add `INVALID_TIMECODE_FORMAT` error code.
  - `packages/core/src/index.ts`: Export new utilities.
- **Read-Only**: `packages/core/src/captions.ts` (reference for existing internal logic).

## 3. Implementation Spec
- **Architecture**: Pure functional utilities. No state.
- **Pseudo-Code**:
  ```typescript
  // packages/core/src/errors.ts
  export enum HeliosErrorCode {
    // ...
    INVALID_TIMECODE_FORMAT = 'INVALID_TIMECODE_FORMAT'
  }

  // packages/core/src/timecode.ts
  export function framesToTimecode(frame: number, fps: number): string {
    // Validate fps > 0
    // Calculate total seconds = frame / fps
    // Calculate h, m, s, f
    // f = frame % fps
    // s = floor(total seconds) % 60
    // m = floor(total seconds / 60) % 60
    // h = floor(total seconds / 3600)
    // Return "HH:MM:SS:FF" (pad with 0)
  }

  export function timecodeToFrames(timecode: string, fps: number): number {
    // Regex validate /^(\d{2}):(\d{2}):(\d{2}):(\d{2})$/
    // If invalid, throw INVALID_TIMECODE_FORMAT
    // Parse h, m, s, f
    // Return (h*3600 + m*60 + s) * fps + f
  }

  export function framesToTimestamp(frame: number, fps: number): string {
     // Calculate total ms = (frame / fps) * 1000
     // Format as HH:MM:SS.mmm (SRT style, period or comma?)
     // Standardize on dot for general usage: HH:MM:SS.mmm
  }
  ```
- **Public API Changes**:
  - Export `framesToTimecode`, `timecodeToFrames`, `framesToTimestamp`.
  - Export `HeliosErrorCode.INVALID_TIMECODE_FORMAT`.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `framesToTimecode(30, 30)` returns `"00:00:01:00"`.
  - `timecodeToFrames("00:00:01:00", 30)` returns `30`.
  - Invalid formats throw `INVALID_TIMECODE_FORMAT`.
  - Roundtrip `timecodeToFrames(framesToTimecode(f))` equals `f`.
  - Edge cases: frame 0, large frames.
