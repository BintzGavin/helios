# 📋 Plan: Implement Audio Track Control

## 1. Context & Goal
- **Objective**: Add `setAudioTrackVolume` and `setAudioTrackMuted` to `HeliosController` and the Bridge protocol.
- **Trigger**: Studio needs to control individual audio tracks via the Bridge, but the current `HeliosController` interface only supports global volume.
- **Impact**: Enables granular audio mixing in the Studio interface by exposing Core's existing capabilities through the Player bridge.

## 2. File Inventory
- **Modify**: `packages/player/src/controllers.ts` (Update interface and class implementations)
- **Modify**: `packages/player/src/bridge.ts` (Add message handlers)
- **Modify**: `packages/player/src/controllers.test.ts` (Add unit tests for new methods)
- **Read-Only**: `packages/player/src/index.ts`

## 3. Implementation Spec
- **Architecture**: Extend the `HeliosController` interface and the `postMessage` bridge protocol to support track-specific audio commands.
- **Pseudo-Code**:
  - **Update `HeliosController` Interface**:
    - Add `setAudioTrackVolume(trackId: string, volume: number): void`
    - Add `setAudioTrackMuted(trackId: string, muted: boolean): void`
  - **Update `DirectController`**:
    - Implement methods by delegating to `this.instance.setAudioTrackVolume` and `this.instance.setAudioTrackMuted`.
  - **Update `BridgeController`**:
    - Implement methods by sending `HELIOS_SET_AUDIO_TRACK_VOLUME` and `HELIOS_SET_AUDIO_TRACK_MUTED` messages.
    - Payload should include `trackId` and value (`volume` or `muted`).
  - **Update `bridge.ts`**:
    - Add switch cases for `HELIOS_SET_AUDIO_TRACK_VOLUME` and `HELIOS_SET_AUDIO_TRACK_MUTED`.
    - Validate payload types (trackId is string, volume/muted is correct type).
    - Call corresponding methods on `helios` instance.

## 4. Test Plan
- **Verification**: Run `npm run build -w packages/player` to ensure types are correct, then `npm test -w packages/player` to verify logic.
- **Success Criteria**:
  - `HeliosController` interface includes new methods.
  - `DirectController` correctly calls the underlying `Helios` instance.
  - `BridgeController` correctly emits `postMessage` events with the right payload.
  - `bridge.ts` correctly interprets messages and calls the `Helios` instance.
- **Edge Cases**:
  - Invalid payload types in bridge messages (should be ignored safely).
  - Missing `trackId` in bridge messages (should be ignored).
  - Calling methods with non-existent `trackId` (Core handles this safely, Player just passes it through).
