# 2026-02-18-STUDIO-Captions

## 1. Context & Goal
- **Objective**: Implement a Captions Panel and Timeline Markers to enable SRT import, state injection, and visualization in Studio.
- **Trigger**: The README lists "Caption/subtitle import (SRT)" as a planned feature, but it is currently missing.
- **Impact**: Enables users to work with captions in Studio immediately, bridging the gap before full player integration, and provides visual feedback on the timeline.

## 2. File Inventory
- **Create**:
  - `packages/studio/src/utils/srt.ts`: Utility for parsing SRT content into `CaptionCue[]`.
  - `packages/studio/src/utils/srt.test.ts`: Unit tests for SRT parsing logic.
  - `packages/studio/src/components/CaptionsPanel/CaptionsPanel.tsx`: New panel component for importing and viewing captions.
  - `packages/studio/src/components/CaptionsPanel/CaptionsPanel.css`: Styles for the Captions Panel.
- **Modify**:
  - `packages/studio/src/components/Sidebar/Sidebar.tsx`: Add "Captions" tab to the sidebar.
  - `packages/studio/src/components/Timeline/Timeline.tsx`: Add visualization of caption markers on the timeline track.
  - `packages/studio/src/components/Timeline/Timeline.css`: Add styles for caption markers.
- **Read-Only**:
  - `packages/studio/src/context/StudioContext.tsx`: accessing `playerState` and `inputProps`.

## 3. Implementation Spec
- **Architecture**:
  - **SRT Parsing**: Implemented in `src/utils/srt.ts` (duplicated from Core to maintain package independence if needed, or imported if possible).
  - **State Injection**: The `CaptionsPanel` will parse uploaded SRT files and update `playerState.inputProps.captions`.
  - **Visualization**: `Timeline` component will read `playerState.inputProps.captions` to render markers.
- **Pseudo-Code**:
  - `srt.ts`: Regex-based parser returning `{ id, startTime, endTime, text }[]`.
  - `CaptionsPanel.tsx`: File input -> `readAsText` -> `parseSrt` -> `setPlayerState`.
  - `Timeline.tsx`: map `captions` to divs with `left: (startTime/duration)%` and `width: ((endTime-startTime)/duration)%`.
- **Public API Changes**: None (internal Studio UI changes only).
- **Dependencies**: None external (uses standard Web APIs).

## 4. Test Plan
- **Verification**:
  - Run `npm test` to verify `srt.test.ts`.
  - Run `npx helios studio` to start the dev server.
  - Open "Captions" tab.
  - Import a valid SRT file.
  - Verify `inputProps` in Props Editor shows the `captions` array.
  - Verify markers appear on the Timeline.
- **Success Criteria**:
  - `srt.test.ts` passes.
  - Importing SRT updates `inputProps`.
  - Timeline markers are visible and positioned correctly.
- **Edge Cases**:
  - Invalid SRT format (should handle gracefully).
  - Empty SRT file (clear captions).
  - Large SRT file (performance check).
