# Implement Audio Controls in Studio UI

## 1. Context & Goal
- **Objective**: Add volume and mute controls to the Helios Studio playback interface.
- **Trigger**: The Core and Player packages support audio volume/mute, but the Studio UI lacks controls for them. This is a gap in the "Playback Controls" feature.
- **Impact**: Users will be able to control audio playback volume and mute state directly from the Studio interface, bringing it closer to a full video editing environment.

## 2. File Inventory
- **Modify**: `packages/studio/src/context/StudioContext.tsx` (Update `PlayerState` definition and defaults)
- **Modify**: `packages/studio/src/components/Controls/PlaybackControls.tsx` (Add Volume/Mute UI elements)

## 3. Implementation Spec

### StudioContext (`packages/studio/src/context/StudioContext.tsx`)
- Update `PlayerState` interface:
  ```typescript
  export interface PlayerState {
    // ... existing props
    volume: number;
    muted: boolean;
  }
  ```
- Update `DEFAULT_PLAYER_STATE` to include:
  - `volume: 1`
  - `muted: false`

### PlaybackControls (`packages/studio/src/components/Controls/PlaybackControls.tsx`)
- Add a new section for audio controls (integrated into the existing flex container).
- **Mute Button**:
  - Should toggle `controller.setAudioMuted(!muted)`.
  - Icon should switch between Mute/Unmute (e.g., "🔊" vs "🔇").
  - Should reflect `playerState.muted` (or `playerState.volume === 0`).
- **Volume Slider**:
  - Input type `range`.
  - Min: 0, Max: 1, Step: 0.05.
  - Value: `playerState.volume`.
  - On Change: Call `controller.setAudioVolume(parseFloat(e.target.value))`.
  - UX Enhancement: If volume > 0, ensure unmuted (optional, but standard behavior).

## 4. Test Plan
- **Verification**:
  - Run `npx helios studio` (or `npm run dev` in `packages/studio`).
  - Verify the Volume slider and Mute button appear in the toolbar.
  - Verify sliding the volume slider updates the UI value.
  - Verify clicking Mute toggles the icon and UI state.
- **Success Criteria**:
  - `PlayerState` in Context correctly tracks `volume` and `muted`.
  - Controls are responsive and call the Controller methods.
- **Edge Cases**:
  - Initial load should show correct defaults (100% volume, unmuted).
