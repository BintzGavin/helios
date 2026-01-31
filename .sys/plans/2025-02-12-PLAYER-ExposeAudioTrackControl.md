# Plan: Expose Audio Track Control in HeliosController

## 1. Context & Goal
- **Objective**: Expose `setAudioTrackVolume` and `setAudioTrackMuted` methods in the `HeliosController` interface and implement them in `DirectController` and `BridgeController`.
- **Trigger**: Vision gap "Advanced audio mixing" requires track-level control, which is supported in Core but blocked by the Player interface.
- **Impact**: Unlocks ability for hosting applications (like Studio) to control individual audio track volumes and mute states via the Player bridge.

## 2. File Inventory
- **Modify**:
    - `packages/player/src/controllers.ts`: Update `HeliosController` interface and implementations.
    - `packages/player/src/bridge.ts`: Update `connectToParent` to handle new bridge messages.
    - `packages/player/src/index.test.ts`: Update manual mocks to match the new `HeliosController` interface.
    - `packages/player/src/controllers.test.ts`: Update mocks and add new unit tests for track control.
- **Read-Only**:
    - `packages/core/src/index.ts` (Reference for `Helios` API)

## 3. Implementation Spec

### Architecture
- **Interface Extension**: Add `setAudioTrackVolume(trackId: string, volume: number)` and `setAudioTrackMuted(trackId: string, muted: boolean)` to `HeliosController`.
- **DirectController**: Delegate calls directly to `this.instance`.
- **BridgeController**: Send `HELIOS_SET_TRACK_VOLUME` and `HELIOS_SET_TRACK_MUTED` messages via `postMessage`.
- **Bridge Protocol**: Update `connectToParent` in `bridge.ts` to listen for these new message types and invoke the corresponding methods on the `Helios` instance.

### Pseudo-Code

**`packages/player/src/controllers.ts`**
```typescript
interface HeliosController {
  // ... existing methods
  setAudioTrackVolume(trackId: string, volume: number): void;
  setAudioTrackMuted(trackId: string, muted: boolean): void;
}

class DirectController implements HeliosController {
  // ...
  setAudioTrackVolume(trackId, volume) { this.instance.setAudioTrackVolume(trackId, volume); }
  setAudioTrackMuted(trackId, muted) { this.instance.setAudioTrackMuted(trackId, muted); }
}

class BridgeController implements HeliosController {
  // ...
  setAudioTrackVolume(trackId, volume) {
    this.iframeWindow.postMessage({ type: 'HELIOS_SET_TRACK_VOLUME', trackId, volume }, '*');
  }
  setAudioTrackMuted(trackId, muted) {
    this.iframeWindow.postMessage({ type: 'HELIOS_SET_TRACK_MUTED', trackId, muted }, '*');
  }
}
```

**`packages/player/src/bridge.ts`**
```typescript
function connectToParent(helios: Helios) {
  window.addEventListener('message', (event) => {
    // ...
    switch (event.data.type) {
      // ...
      case 'HELIOS_SET_TRACK_VOLUME':
        if (typeof event.data.volume === 'number' && event.data.trackId) {
          helios.setAudioTrackVolume(event.data.trackId, event.data.volume);
        }
        break;
      case 'HELIOS_SET_TRACK_MUTED':
        if (typeof event.data.muted === 'boolean' && event.data.trackId) {
          helios.setAudioTrackMuted(event.data.trackId, event.data.muted);
        }
        break;
    }
  });
}
```

## 4. Test Plan
- **Verification**:
  - Update `packages/player/src/index.test.ts` to include `setAudioTrackVolume: vi.fn()` and `setAudioTrackMuted: vi.fn()` in all mock controller objects.
  - Update `packages/player/src/controllers.test.ts`:
    - Add `setAudioTrackVolume` and `setAudioTrackMuted` to `mockHeliosInstance`.
    - Add tests to verify `DirectController` calls these methods on `mockHeliosInstance`.
    - Add tests to verify `BridgeController` sends `HELIOS_SET_TRACK_VOLUME` and `HELIOS_SET_TRACK_MUTED` messages.
  - Run `npm test -w packages/player` to ensure all tests pass.
- **Success Criteria**:
  - `HeliosController` interface includes the new methods.
  - Unit tests confirm plumbing works from Controller -> Bridge -> Helios.
