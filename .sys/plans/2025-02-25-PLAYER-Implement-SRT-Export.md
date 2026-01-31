# Context & Goal
- **Objective**: Implement SRT (SubRip Subtitle) export capability in `helios-player` and `ClientSideExporter`.
- **Trigger**: The Roadmap explicitly lists "Caption export (burned-in or SRT)" as a V1.x feature. Currently only burn-in is supported.
- **Impact**: Enables users to export subtitles as sidecar files (.srt) instead of permanently burning them into the video, improving accessibility and flexibility for post-production.

# File Inventory
- **Create**:
  - `packages/player/src/features/srt-parser.test.ts`: Unit tests for SRT stringification.
- **Modify**:
  - `packages/player/src/features/srt-parser.ts`: Add `stringifySRT` function.
  - `packages/player/src/features/exporter.ts`: Add `saveCaptionsAsSRT` method to `ClientSideExporter`.
  - `packages/player/src/index.ts`: Add `export-caption-mode` attribute and integrate SRT export logic.
- **Read-Only**: `packages/player/src/features/text-tracks.ts`.

# Implementation Spec
- **Architecture**:
  - Extend `srt-parser` module with a generator function that converts cue objects to formatted SRT string.
  - Enhance `ClientSideExporter` to handle SRT file generation and download (Blob creation).
  - Update `HeliosPlayer` Web Component to observe `export-caption-mode` (`burn-in` | `file`) and dispatch the appropriate export command.
- **Pseudo-Code**:
  - In `srt-parser.ts`:
    - Implement `formatTime(seconds)` to return `HH:MM:SS,mmm`.
    - Implement `stringifySRT(cues)` to join cues with index and timestamps.
  - In `exporter.ts`:
    - Add `saveCaptionsAsSRT(cues, filename)` method.
    - Uses `stringifySRT` and triggers browser download via `download()` helper.
  - In `index.ts`:
    - Add `export-caption-mode` to `observedAttributes`.
    - In `renderClientSide`:
      - Gather all cues from showing `textTracks`.
      - If `export-caption-mode` is `file`:
        - Call `exporter.saveCaptionsAsSRT(cues, "captions.srt")`.
        - Continue to export video WITHOUT burn-in (pass `includeCaptions: false`).
        - *Note: Alternatively, we could just export SRT and stop, but usually "Export" implies the video. The spec assumes parallel export if file mode is selected.*
      - If `export-caption-mode` is `burn-in`:
        - Pass `includeCaptions: true` to `export()`.
- **Public API Changes**:
  - `ClientSideExporter`: New method `saveCaptionsAsSRT`.
  - `helios-player`: New attribute `export-caption-mode`.

# Test Plan
- **Verification**:
  - Run `npm run build` in `packages/player`.
  - Run `npx vitest packages/player/src/features/srt-parser.test.ts`.
- **Success Criteria**:
  - `stringifySRT` correctly formats timestamps and indices (verified by unit test).
  - `helios-player` accepts `export-caption-mode` attribute.
