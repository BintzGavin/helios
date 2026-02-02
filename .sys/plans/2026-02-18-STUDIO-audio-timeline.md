# Spec: Studio Audio Timeline Visualization

## 1. Context & Goal
- **Objective**: Visualize audio tracks on the Studio Timeline and centralize audio track state management.
- **Trigger**: The Vision ("Visual timeline") vs. Reality (Hidden audio tracks). Users can hear audio but cannot see its placement relative to the video frames.
- **Impact**: Enables precise timing adjustments for audio-visual synchronization. Centralizes audio state for better consistency between Mixer and Timeline.

## 2. File Inventory
- **Create**:
    - `packages/studio/src/types.ts`: Shared types definition (AudioTrack, etc.).
- **Modify**:
    - `packages/studio/src/context/StudioContext.tsx`: Add `audioTracks` to state, implement fetching/decoding/caching logic, and expose update methods.
    - `packages/studio/src/components/Timeline.tsx`: Render audio tracks visually.
    - `packages/studio/src/components/Timeline.css`: Styles for audio tracks.
    - `packages/studio/src/components/Timeline.test.tsx`: Verify rendering.
    - `packages/studio/src/components/AudioMixerPanel/AudioMixerPanel.tsx`: Refactor to use centralized state.
- **Read-Only**:
    - `packages/player/src/features/audio-utils.ts` (Reference for AudioAsset structure)

## 3. Implementation Spec

### Architecture
- **State Management**: Move `audioTracks` (and their metadata like duration/volume) from `AudioMixerPanel` local state to `StudioContext` global state.
- **Data Flow**:
    1. `StudioContext` fetches raw assets via `controller.getAudioTracks()`.
    2. `StudioContext` calculates duration (decoding buffer if needed) and caches it.
    3. `StudioContext` exposes `playerState.audioTracks` (read-only for UI) and `updateAudioTrack...` methods.
    4. `Timeline` and `AudioMixerPanel` consume this state.

### Types (packages/studio/src/types.ts)
```typescript
export interface AudioTrack {
  id: string;
  buffer?: ArrayBuffer;
  mimeType: string | null;
  volume: number;
  muted: boolean;
  loop: boolean;
  startTime: number; // ms
  duration: number; // ms (calculated)
  fadeInDuration: number;
  fadeOutDuration: number;
}
```

### StudioContext Updates
- Add `audioTracks` to `PlayerState`.
- Implement `refreshAudioTracks()`:
    - Calls `controller.getAudioTracks()`.
    - Merges with existing state (preserving calculated durations to avoid re-decoding).
    - If new buffer, decode using `AudioContext` to get duration.
    - Cache decoded durations in a `useRef` map to persist across re-renders.
- Implement `setAudioTrackVolume(id, vol)`: Calls controller & updates local state.
- Implement `setAudioTrackMuted(id, muted)`: Calls controller & updates local state.
- Trigger `refreshAudioTracks` on:
    - Controller connection.
    - `inputProps` change (debounced or explicit check).

### Timeline Updates
- Add a new "track row" container below the ruler.
- Render `<div className="timeline-audio-track">` for each track.
- Position using `left: (startTime / totalDuration)%` and `width: (duration / totalDuration)%`.
- Style to look distinct (e.g., green/blue bars).

### AudioMixerPanel Updates
- Remove local `fetchTracks`, `tracks` state.
- Use `playerState.audioTracks`.
- Use `context.setAudioTrackVolume` / `Muted`.

### Timeline.test.tsx Updates
- Update the mock context `defaultPlayerState` to include `audioTracks: []`.
- Add a new test case: "renders audio tracks from playerState.audioTracks".
    - Mock a player state with `audioTracks: [{ id: 'a1', startTime: 0, duration: 2000, ... }]`.
    - Verify that a `.timeline-audio-track` element is rendered with correct positioning and attributes.

## 4. Test Plan
- **Verification**:
    - `npm test -w packages/studio` (Focus on `Timeline.test.tsx`).
    - `npx helios studio` -> Load a composition with audio.
    - Check if audio bars appear on timeline.
    - Check if Audio Mixer still works (syncs volume/mute).
- **Edge Cases**:
    - No audio tracks.
    - Audio track with 0 duration.
    - Audio track starting negative or beyond duration.
    - Large audio files (decoding performance).
