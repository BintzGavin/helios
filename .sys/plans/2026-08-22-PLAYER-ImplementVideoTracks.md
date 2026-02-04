# 2026-08-22-PLAYER-ImplementVideoTracks

#### 1. Context & Goal
- **Objective**: Implement `videoTracks` property and `VideoTrackList` interface on `<helios-player>` to complete Standard Media API parity.
- **Trigger**: Identified gap in API parity; `audioTracks` and `textTracks` exist, but `videoTracks` is missing.
- **Impact**: Enables standard video player wrappers (like those in advertising or CMS ecosystems) to inspect the video track configuration without errors.

#### 2. File Inventory
- **Create**:
  - `packages/player/src/features/video-tracks.ts`: Definition of `HeliosVideoTrack` and `HeliosVideoTrackList`.
  - `packages/player/src/features/video-tracks.test.ts`: Unit tests for the new classes.
- **Modify**:
  - `packages/player/src/index.ts`: Integrate `videoTracks` into `HeliosPlayer`.
  - `packages/player/src/api_parity.test.ts`: Verify API parity.
- **Read-Only**:
  - `packages/player/src/features/audio-tracks.ts`: Reference implementation pattern.

#### 3. Implementation Spec
- **Architecture**:
  - `HeliosVideoTrack` implements standard `VideoTrack` properties: `id`, `kind`, `label`, `language`, `selected`.
  - `HeliosVideoTrackList` extends `EventTarget` and implements `length`, `[index]`, `getTrackById`, `selectedIndex`, `addTrack`, `removeTrack`, `onaddtrack`, `onremovetrack`, `onchange`.
  - `HeliosPlayer` initializes a `videoTracks` list with one default track ("main").
- **Pseudo-Code**:
  - Define `VideoTrackHost` interface with `handleVideoTrackSelectedChange(track)`.
  - `HeliosVideoTrack` setter for `selected` calls `host.handleVideoTrackSelectedChange(this)`.
  - `HeliosPlayer.handleVideoTrackSelectedChange`:
    - Ensure mutual exclusivity (if new track selected, deselect others).
    - Dispatch 'change' event on the list.
    - (Future: Integrate with renderer to actually hide/show video if needed, but for now API surface is priority).
- **Public API Changes**:
  - `<helios-player>.videoTracks` (Read-only, returns `VideoTrackList`)
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/player`.
- **Success Criteria**: All tests pass, including the new `video-tracks.test.ts` and updated `api_parity.test.ts`.
- **Edge Cases**: Deselecting the only track should update `selectedIndex` to -1.
