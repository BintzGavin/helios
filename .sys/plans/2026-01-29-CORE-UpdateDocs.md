# 2026-01-29 - Update Core Documentation

## 1. Context & Goal
- **Objective**: Update `packages/core/README.md` to reflect the full capabilities of the library (Markers, Captions, Transitions, Color, Timecode, Input Schema).
- **Trigger**: Gap between Implemented Features (Reality) and Package Documentation (Vision). The current README misses critical v1.x features and lists the wrong license.
- **Impact**: Improves Developer Experience and Agent Experience by providing accurate, comprehensive documentation.

## 2. File Inventory
- **Modify**: `packages/core/README.md`
- **Read-Only**: `packages/core/src/index.ts`, `packages/core/src/transitions.ts`, `packages/core/src/color.ts`, `packages/core/src/timecode.ts`

## 3. Implementation Spec
- **Architecture**: Documentation update only.
- **Content Updates**:
  - **License**: Update "MIT" to "Elastic License 2.0 (ELv2)".
  - **Markers**: Add section explaining `Marker` interface, `addMarker(marker)`, `seekToMarker(id)`.
  - **Captions**: Add section explaining `setCaptions(srt | cues)`, `activeCaptions` signal.
  - **Transitions**: Add section explaining `transition(frame, start, duration)` and `crossfade(frame, start, duration)`.
  - **Color**: Add section explaining `interpolateColors(val, in, out)` and `parseColor(str)`.
  - **Timecode**: Add section explaining `framesToTimecode`, `timecodeToFrames`, `framesToTimestamp`.
  - **Input Schema**: Add section explaining `HeliosOptions.schema` and supported types (`image`, `video`, `audio`, `font`, `color`, etc.).
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1. Run `npm test -w packages/core` to ensure no side effects.
  2. Run `cat packages/core/README.md` to display the updated content.
- **Success Criteria**: The README contains new sections for Markers, Captions, Transitions, Color, Timecode, and Input Schema, and the license is ELv2.
- **Edge Cases**: None.
