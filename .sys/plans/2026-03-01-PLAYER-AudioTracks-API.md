# Context & Goal
- **Objective**: Implement the `audioTracks` property and `AudioTrackList` API on `<helios-player>` to provide Standard Media API parity and enable granular programmatic control of audio tracks.
- **Trigger**: Vision gap identified in "Standard Media API" parity (missing `audioTracks`) and Journal "Audio Track Control Gap".
- **Impact**: Enables developers to list, enable, and disable audio tracks (e.g., languages, commentary) programmatically using standard idioms, aligning with the `HeliosController` audio capabilities.

# File Inventory
- **Create**: `packages/player/src/features/audio-tracks.ts`
  - Purpose: Implement `HeliosAudioTrack` and `HeliosAudioTrackList` classes.
- **Modify**: `packages/player/src/index.ts`
  - Purpose: Expose `audioTracks` property, sync it with `state.availableAudioTracks`, and handle enabled state changes.
- **Read-Only**: `packages/player/src/controllers.ts`, `packages/player/src/features/audio-utils.ts`

# Implementation Spec
- **Architecture**:
  - Mimic the existing `HeliosTextTrack` pattern: `HeliosAudioTrack` wraps track state, `HeliosAudioTrackList` manages the collection and event dispatching.
  - `HeliosPlayer` acts as the `AudioTrackHost` to bridge `AudioTrack.enabled` changes to `controller.setAudioTrackMuted()`.
- **Logic Flow**:
  1.  **Initialization**: `HeliosPlayer` initializes `_audioTracks` (empty `HeliosAudioTrackList`).
  2.  **Sync (updateUI)**:
      - Receive `state` from controller.
      - Iterate `state.availableAudioTracks` (metadata) to identify valid tracks.
      - For each metadata track:
          - If not in `_audioTracks`, create new `HeliosAudioTrack` instance.
          - **Defaults**: Set `label` to `track.id` (since metadata lacks label), `kind` to `''` (empty string), `language` to `''`.
          - Update `enabled` property based on `state.audioTracks[id].muted`. Logic: `enabled` is `!muted`. If `state.audioTracks[id]` is undefined, assume `enabled = true`.
      - Remove tracks from `_audioTracks` that are no longer present in `availableAudioTracks` metadata.
  3.  **Interaction**:
      - User sets `track.enabled = val`.
      - Track calls `host.handleAudioTrackEnabledChange(track)`.
      - Host calls `controller.setAudioTrackMuted(track.id, !val)`.
- **Public API Changes**:
  - `HeliosPlayer.audioTracks`: Returns Read-only `HeliosAudioTrackList`.
  - `HeliosAudioTrack` interface:
      - `id`: string (read-only)
      - `kind`: string (read-only)
      - `label`: string (read-only)
      - `language`: string (read-only)
      - `enabled`: boolean (read-write)
  - `HeliosAudioTrackList` interface:
      - `length`: number
      - `[index]`: HeliosAudioTrack
      - `getTrackById(id: string)`: HeliosAudioTrack | null
      - `onaddtrack`: event handler
      - `onremovetrack`: event handler
      - `onchange`: event handler
- **Dependencies**: None.

# Test Plan
- **Verification**: `npm run test -w packages/player`
- **Unit Tests**:
  - Verify `audioTracks` property is exposed on `HeliosPlayer`.
  - Verify tracks are added/removed from the list based on mock state updates passed to `updateUI`.
  - Verify setting `track.enabled = false` calls `controller.setAudioTrackMuted(id, true)`.
  - Verify state updates (muted: true) reflect in `track.enabled` (false).
