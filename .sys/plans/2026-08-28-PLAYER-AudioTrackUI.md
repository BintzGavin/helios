# Context & Goal
- **Objective**: Implement a UI menu within `<helios-player>` to allow users to mute/unmute and adjust volume for individual audio tracks found in the composition.
- **Trigger**: The `AudioTracks` API and backend logic (`setAudioTrackMuted`, `setAudioTrackVolume`) are implemented, but there is no user-facing control to interact with them in the Player UI.
- **Impact**: Enables users to debug and preview multi-track audio compositions (e.g., checking voiceover vs. background music) directly in the player without writing code.

# File Inventory
- **Modify**: `packages/player/src/index.ts` (Add UI elements, styles, and logic for the Audio Menu)
- **Read-Only**: `packages/player/src/features/audio-tracks.ts` (Reference for `HeliosAudioTrack` interface)
- **Read-Only**: `packages/player/src/controllers.ts` (Reference for `HeliosController` methods)

# Implementation Spec
- **Architecture**:
  - Add a new "Audio" button (`🎵`) to the controls toolbar (next to Volume).
  - Add a popover menu (`.audio-menu`) inside the Shadow DOM that lists all available audio tracks.
  - Use `HeliosAudioTrackList` events (`addtrack`, `removetrack`, `change`) to keep the menu in sync.
  - Implement "Smart Visibility": The Audio button is hidden if `audioTracks.length === 0`.
- **UI Structure**:
  ```html
  <div class="audio-menu hidden">
     <div class="track-item">
        <span class="track-label">Background Music</span>
        <input type="range" class="track-volume" ...>
        <button class="track-mute-btn">🔊</button>
     </div>
  </div>
  ```
- **Logic**:
  - `toggleAudioMenu()`: Toggles visibility of the menu.
  - `renderAudioMenu()`: Re-renders the list of tracks based on `this._audioTracks`.
  - Listen for `click` on document/host to close menu when clicking outside.
  - Each track item binds to `track.enabled` (mute toggle) and calls `controller.setAudioTrackVolume`.
  - Persist volume state locally in the menu UI if needed, but rely on controller state updates (`updateUI`) to refresh the view to ensure single source of truth.
  - Styles: Ensure the menu is positioned correctly above the toolbar and handles overflow for many tracks.

# Test Plan
- **Verification**: `npm test packages/player`
- **Success Criteria**:
  - Button appears when tracks exist.
  - Menu lists tracks with correct labels.
  - Toggling mute in the menu updates the `controller` state.
  - Changing volume in the menu updates the `controller` state.
- **Edge Cases**:
  - 0 tracks -> Button hidden.
  - 10+ tracks -> Menu should scroll (max-height).
  - Long track names -> Text truncation/wrapping.
