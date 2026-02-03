# Plan: Implement Audio Mixer Solo

## 1. Context & Goal
- **Objective**: Implement "Solo" functionality in the Audio Mixer Panel.
- **Trigger**: Roadmap V1.x - "Advanced audio mixing".
- **Justification**: The core Studio features defined in the vision (Timeline Scrubber, Props Editor, Assets Panel, Renders Panel, Canvas Controls, Omnibar) are currently implemented (see `docs/status/STUDIO.md` v0.85.0). The next critical milestone in the V1.x Roadmap is "Captions & Audio", specifically "Advanced audio mixing". Implementing "Solo" functionality is a fundamental requirement for mixing and bridges the gap between the current basic volume controls and the advanced mixing vision.
- **Impact**: Enables precise audio auditing and editing, a standard expectation for video creation tools.

## 2. File Inventory
- **Modify**:
  - `packages/studio/src/components/AudioMixerPanel/AudioMixerPanel.tsx`: Update state management to handle Solo logic and rendering.
  - `packages/studio/src/components/AudioMixerPanel/AudioMixerPanel.css`: Add styles for the Solo button.

## 3. Implementation Spec

### Component Design: `AudioMixerPanel`
- **New State**:
  - `soloTrackId`: `string | null` (Track currently soloed).
  - `muteSnapshot`: `Record<string, boolean>` (Snapshot of mute states before solo was activated).

- **Logic**:
  - `handleSoloToggle(id: string)`:
    - **If activating Solo (id != soloTrackId)**:
      - If starting from no solo: Capture current mute state of all tracks into `muteSnapshot`.
      - If switching solo (already soloed): Keep existing snapshot.
      - Set `soloTrackId` to `id`.
      - **Apply Mutes**:
        - Call `controller.setAudioTrackMuted(id, false)` (Unmute target).
        - For all other tracks, call `controller.setAudioTrackMuted(otherId, true)` (Mute others).
    - **If deactivating Solo (id == soloTrackId)**:
      - Set `soloTrackId` to `null`.
      - **Restore Mutes**:
        - Iterate through `muteSnapshot`.
        - Restore each track's mute state via `controller.setAudioTrackMuted`.

- **UI Changes**:
  - Add a "Solo" button (e.g., "S") next to the Mute button.
  - Style: Yellow/Orange when active.
  - Behavior:
    - When Solo is active, other tracks' Mute buttons should visually reflect they are disabled or overridden.

### Dependencies
- Uses existing `controller.setAudioTrackMuted` API.
- No changes to Core/Player required.

## 4. Test Plan
- **Verification**:
  - Open Studio with a composition containing multiple audio tracks.
  - Click "Solo" on Track A.
    - Verify Track A is unmuted.
    - Verify Track B is muted.
  - Click "Solo" on Track A again (Unsolo).
    - Verify Track B returns to its previous mute state.
  - Switch Solo from A to B.
    - Verify A mutes, B unmutes.
