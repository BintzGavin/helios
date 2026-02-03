# 2026-02-01-PLAYER-Audio-Tracks

#### 1. Context & Goal
- **Objective**: Implement the `audioTracks` property and `AudioTrackList` interface on `<helios-player>` to expose discovered audio tracks and enable granular control (mute/unmute) via a standard API.
- **Trigger**: "Standard Media API Parity" vision gap and "Advanced Audio Mixing" roadmap requirement. Currently, tracks can only be controlled if IDs are known, but there is no mechanism to discover them.
- **Impact**: Enables custom UIs (like Studio mixers) to list and control individual audio tracks. Improves generic player capabilities.

#### 2. File Inventory
- **Create**: `packages/player/src/features/audio-tracks.ts` (Implement `HeliosAudioTrack` and `HeliosAudioTrackList` classes).
- **Modify**: `packages/player/src/features/audio-utils.ts` (Add `AudioTrackMetadata` interface and `scanAudioTracks` function).
- **Modify**: `packages/player/src/controllers.ts` (Add `getAudioTrackList` to `HeliosController` interface and implementations).
- **Modify**: `packages/player/src/bridge.ts` (Handle `HELIOS_GET_AUDIO_TRACK_LIST` message).
- **Modify**: `packages/player/src/index.ts` (Add `audioTracks` property to `HeliosPlayer` and sync logic).
- **Read-Only**: `packages/core/src/index.ts` (Implicit dependency on Core behavior).

#### 3. Implementation Spec
- **Architecture**:
  - `HeliosAudioTrack` wraps track metadata (`id`, `kind`, `label`, `language`, `enabled`) and calls `player.controller.setAudioTrackMuted(id, !enabled)` on change.
  - `HeliosAudioTrackList` maintains the list of tracks and emits `change`, `addtrack`, `removetrack` events (Standard `EventTarget`).
  - `AudioTrackMetadata` is a lightweight structure (no buffers) for passing track info across the bridge.

- **Pseudo-Code**:
  - **audio-utils.ts**:
    - Update `AudioAsset` to include `id`.
    - Update `getAudioAssets` to populate `id` (from element ID).
    - Create `scanAudioTracks(doc)` that returns `AudioTrackMetadata[]` (id, kind, label, language, enabled).
  - **controllers.ts**:
    - `HeliosController` interface adds `getAudioTrackList()`.
    - `DirectController`: calls `scanAudioTracks(document)`.
    - `BridgeController`: sends `HELIOS_GET_AUDIO_TRACK_LIST` and waits for response.
  - **bridge.ts**:
    - On `HELIOS_GET_AUDIO_TRACK_LIST`: call `scanAudioTracks`, send back result.
  - **audio-tracks.ts**:
    - `HeliosAudioTrack`:
      - Properties: `id`, `kind`, `label`, `language`, `enabled`.
      - Setter for `enabled`: calls `controller.setAudioTrackMuted`.
    - `HeliosAudioTrackList`:
      - Properties: `length`, index accessors (via Proxy or array).
      - Methods: `getTrackById`.
      - Events: `onaddtrack`, `onremovetrack`, `onchange`.
  - **index.ts**:
    - Add `audioTracks: HeliosAudioTrackList`.
    - On connection (`setController`), call `controller.getAudioTrackList()`.
    - Populate `audioTracks`.
    - Listen for changes.

- **Public API Changes**:
  - `<helios-player>`: adds `.audioTracks` (Read-only `HeliosAudioTrackList`).
  - `HeliosController`: adds `getAudioTrackList()`.

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - `audio-tracks.test.ts` passes, verifying list management and event emission.
  - Integration: When `enabled` is toggled on a track in the list, `setAudioTrackMuted` is called on the controller.
- **Edge Cases**:
  - No audio tracks found (list empty).
  - Tracks with duplicate IDs (should handle gracefully or dedupe).
  - Tracks with no IDs (should generate one or skip?). *Decision: Return empty ID, but warn.*
