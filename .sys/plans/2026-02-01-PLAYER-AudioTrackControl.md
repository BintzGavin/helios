# 2026-02-01-PLAYER-AudioTrackControl

## 1. Context & Goal
- **Objective**: Expose granular audio track control (volume/mute) in the `HeliosController` interface and its implementations (`DirectController`, `BridgeController`).
- **Trigger**: Studio requires control over individual audio tracks, but `HeliosController` currently only supports global volume/mute. `packages/core` already supports this via `Helios.setAudioTrackVolume` and `Helios.setAudioTrackMuted`.
- **Impact**: Enables Studio (and other consumers) to mix audio tracks individually by sending track-specific commands through the player bridge.

## 2. File Inventory
- **Modify**:
  - `packages/player/src/controllers.ts`: Update `HeliosController` interface and `DirectController`/`BridgeController` implementations.
  - `packages/player/src/bridge.ts`: Update `connectToParent` to handle `HELIOS_SET_AUDIO_TRACK_VOLUME` and `HELIOS_SET_AUDIO_TRACK_MUTED` messages.
  - `packages/player/src/controllers.test.ts`: Add unit tests for `setAudioTrackVolume` and `setAudioTrackMuted` in both controllers.
- **Read-Only**:
  - `packages/core/src/index.ts`: Reference for `Helios` class API.

## 3. Implementation Spec

### Architecture
- **Interface Expansion**: The `HeliosController` interface will now include methods for track-specific audio control.
- **Direct Mode**: `DirectController` will proxy calls directly to the underlying `Helios` instance methods.
- **Bridge Mode**: `BridgeController` will serialize these calls into `HELIOS_SET_AUDIO_TRACK_VOLUME` and `HELIOS_SET_AUDIO_TRACK_MUTED` postMessages.
- **Bridge Listener**: The `connectToParent` function (used by the child/composition) will deserialize these messages and invoke the corresponding `Helios` methods.

### Pseudo-Code

**packages/player/src/controllers.ts**
```typescript
export interface HeliosController {
  // ... existing methods
  setAudioTrackVolume(trackId: string, volume: number): void;
  setAudioTrackMuted(trackId: string, muted: boolean): void;
}

export class DirectController implements HeliosController {
  // ...
  setAudioTrackVolume(trackId: string, volume: number) {
    this.instance.setAudioTrackVolume(trackId, volume);
  }
  setAudioTrackMuted(trackId: string, muted: boolean) {
    this.instance.setAudioTrackMuted(trackId, muted);
  }
}

export class BridgeController implements HeliosController {
  // ...
  setAudioTrackVolume(trackId: string, volume: number) {
    this.iframeWindow.postMessage({ type: 'HELIOS_SET_AUDIO_TRACK_VOLUME', trackId, volume }, '*');
  }
  setAudioTrackMuted(trackId: string, muted: boolean) {
    this.iframeWindow.postMessage({ type: 'HELIOS_SET_AUDIO_TRACK_MUTED', trackId, muted }, '*');
  }
}
```

**packages/player/src/bridge.ts**
```typescript
export function connectToParent(helios: Helios) {
  window.addEventListener('message', async (event) => {
    // ... existing checks
    const { type } = event.data;
    switch (type) {
      // ... existing cases
      case 'HELIOS_SET_AUDIO_TRACK_VOLUME':
        if (typeof event.data.volume === 'number' && typeof event.data.trackId === 'string') {
          helios.setAudioTrackVolume(event.data.trackId, event.data.volume);
        }
        break;
      case 'HELIOS_SET_AUDIO_TRACK_MUTED':
        if (typeof event.data.muted === 'boolean' && typeof event.data.trackId === 'string') {
          helios.setAudioTrackMuted(event.data.trackId, event.data.muted);
        }
        break;
    }
  });
}
```

### Public API Changes
- **New Methods on `HeliosController`**:
  - `setAudioTrackVolume(trackId: string, volume: number): void`
  - `setAudioTrackMuted(trackId: string, muted: boolean): void`

### Dependencies
- None. `packages/core` already supports these methods.

## 4. Test Plan

### Verification
- Run the player package tests:
  ```bash
  npm test -w packages/player
  ```

### Success Criteria
1.  **Interface Compliance**: Tests compile, confirming `DirectController` and `BridgeController` implement the updated `HeliosController`.
2.  **Direct Mode Test**: `DirectController.setAudioTrackVolume` calls `helios.setAudioTrackVolume` with correct arguments.
3.  **Bridge Mode Test**: `BridgeController.setAudioTrackVolume` posts a message with type `HELIOS_SET_AUDIO_TRACK_VOLUME`, `trackId`, and `volume`.
4.  **No Regressions**: Existing tests pass.

### Edge Cases
- **Missing Parameters**: If `trackId` or `volume` are missing/invalid in the message, `connectToParent` should safely ignore the message (verified by type checks).
- **Non-Existent Track**: `Helios` core handles non-existent tracks gracefully (via default values or internal logic), so the Player doesn't need extra validation.
