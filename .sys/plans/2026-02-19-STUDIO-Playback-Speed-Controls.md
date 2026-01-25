# Context & Goal
- **Objective**: Implement playback speed controls (including reverse) in the Studio UI.
- **Trigger**: Vision Gap - README lists "variable speed playback (including reverse)" as a planned feature.
- **Impact**: Enables users to review animations at different speeds (slow motion, fast forward, reverse) for better debugging and timing analysis.

# File Inventory
- **Modify**: `packages/studio/src/context/StudioContext.tsx` (Add `playbackRate` to state)
- **Modify**: `packages/studio/src/components/Controls/PlaybackControls.tsx` (Add speed selector UI)
- **Read-Only**: `packages/player/src/controllers.ts` (Reference for `setPlaybackRate`)

# Implementation Spec
- **Architecture**:
  - Update `StudioContext` to track `playbackRate` in `PlayerState`.
  - Add a `<select>` or custom dropdown to `PlaybackControls`.
  - Use `controller.setPlaybackRate()` to drive the engine.
  - Reverse playback is achieved by sending negative values to the engine (which supports it via `Helios` logic).

- **Pseudo-Code**:
  ```typescript
  // StudioContext.tsx
  interface PlayerState {
    // ... existing
    playbackRate: number; // Add this
  }
  const DEFAULT_PLAYER_STATE = { ..., playbackRate: 1 };

  // PlaybackControls.tsx
  const { controller, playerState } = useStudio();

  const handleSpeedChange = (rate) => {
    controller.setPlaybackRate(rate);
  }

  return (
    // ... existing buttons
    <select value={playerState.playbackRate} onChange={...}>
      <option value="-1">Rewind (-1x)</option>
      <option value="0.25">0.25x</option>
      <option value="0.5">0.5x</option>
      <option value="1">1x</option>
      <option value="2">2x</option>
    </select>
  )
  ```

- **Public API Changes**:
  - `PlayerState` interface in `StudioContext` gains `playbackRate`.

- **Dependencies**:
  - None. (Engine already supports it).

# Test Plan
- **Verification**:
  - Run `npm run dev` in `packages/studio`.
  - Inspect UI for Speed Selector.
  - Test setting speed to 2x (animation should speed up).
  - Test setting speed to -1x (animation should reverse).
- **Success Criteria**:
  - UI allows selecting speeds.
  - Engine responds to speed changes.
- **Edge Cases**:
  - Reverse playback behavior at start of timeline (should loop or stop).
  - Browser support for negative rates (Helios engine handles this via `requestAnimationFrame` logic, not native `<video>`, so it should work cross-browser).
