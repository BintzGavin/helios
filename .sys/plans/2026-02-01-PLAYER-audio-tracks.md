# 2026-02-01-PLAYER-audio-tracks.md

#### 1. Context & Goal
- **Objective**: Implement `setAudioTrackVolume` and `setAudioTrackMuted` in the `HeliosController` interface and bridge protocol.
- **Trigger**: The Studio domain requires granular control over individual audio tracks, but the current Player API only supports global volume/mute.
- **Impact**: Unlocks track-level audio mixing in Helios Studio.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/player/src/controllers.ts`: Update `HeliosController` interface and `DirectController`/`BridgeController` implementations.
  - `packages/player/src/bridge.ts`: Handle `HELIOS_SET_TRACK_VOLUME` and `HELIOS_SET_TRACK_MUTED` messages.
  - `packages/player/src/controllers.test.ts`: Add unit tests for new methods.
- **Read-Only**: `packages/core/src/index.ts`

#### 3. Implementation Spec
- **Architecture**: Extend the existing Bridge/Controller pattern. `DirectController` calls core methods directly; `BridgeController` uses `postMessage` to trigger core methods inside the iframe.
- **Pseudo-Code**:
  - **Interface Update**: Add methods for setting track volume and mute status to `HeliosController` interface.
  - **DirectController**: Implement new methods to proxy calls directly to the underlying `Helios` instance.
  - **BridgeController**: Implement new methods to serialize arguments into `HELIOS_SET_TRACK_VOLUME` and `HELIOS_SET_TRACK_MUTED` messages and post them to the iframe.
  - **Bridge Handler**:
    - Listen for `HELIOS_SET_TRACK_VOLUME`. Validate `trackId` (string) and `volume` (number). Call `helios.setAudioTrackVolume`.
    - Listen for `HELIOS_SET_TRACK_MUTED`. Validate `trackId` (string) and `muted` (boolean). Call `helios.setAudioTrackMuted`.
- **Public API Changes**:
  - `HeliosController` interface gains:
    - `setAudioTrackVolume(trackId: string, volume: number): void`
    - `setAudioTrackMuted(trackId: string, muted: boolean): void`
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - Unit tests pass for `DirectController` delegating to `Helios` instance.
  - Unit tests pass for `BridgeController` sending correct `postMessage` payloads.
- **Edge Cases**:
  - Invalid types in bridge messages (should be ignored).
  - Missing track IDs (handled by Core, but Player should pass them through).
