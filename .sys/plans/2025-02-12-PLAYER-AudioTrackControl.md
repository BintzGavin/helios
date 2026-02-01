#### 1. Context & Goal
- **Objective**: Implement `setAudioTrackVolume` and `setAudioTrackMuted` methods in the `HeliosController` interface and Bridge protocol.
- **Trigger**: Vision gap identified - `HeliosController` lacks granular audio track control, preventing Studio from implementing audio mixing features despite Core support.
- **Impact**: Unlocks the ability for host applications (like Studio) to control the volume and mute state of individual audio tracks within a composition.

#### 2. File Inventory
- **Modify**: `packages/player/src/controllers.ts`
  - Update `HeliosController` interface to include `setAudioTrackVolume` and `setAudioTrackMuted`.
  - Implement these methods in `DirectController` to call the underlying `Helios` instance.
  - Implement these methods in `BridgeController` to send corresponding postMessages.
- **Modify**: `packages/player/src/bridge.ts`
  - Update `connectToParent` to listen for `HELIOS_SET_AUDIO_TRACK_VOLUME` and `HELIOS_SET_AUDIO_TRACK_MUTED` messages and invoke the `Helios` instance methods.
- **Modify**: `packages/player/src/controllers.test.ts`
  - Add unit tests for `DirectController` to verify it calls the instance methods.
  - Add unit tests for `BridgeController` to verify it sends the correct messages.
- **Modify**: `packages/player/src/api_parity.test.ts`
  - Update the manual `HeliosController` mock to include the new methods, preventing type errors during build/test.
- **Read-Only**: `packages/core/src/index.ts` (Reference only)

#### 3. Implementation Spec
- **Architecture**: Extend the existing Controller/Bridge pattern.
  - `DirectController` provides direct access to the `Helios` instance methods.
  - `BridgeController` proxies the calls via `postMessage` to the iframe, where `bridge.ts` handles them.
- **Pseudo-Code**:
  - In `packages/player/src/controllers.ts`:
    ```typescript
    interface HeliosController {
      // ... existing methods
      setAudioTrackVolume(trackId: string, volume: number): void;
      setAudioTrackMuted(trackId: string, muted: boolean): void;
    }

    class DirectController {
      setAudioTrackVolume(trackId, volume) { this.instance.setAudioTrackVolume(trackId, volume); }
      setAudioTrackMuted(trackId, muted) { this.instance.setAudioTrackMuted(trackId, muted); }
    }

    class BridgeController {
      setAudioTrackVolume(trackId, volume) {
        this.iframeWindow.postMessage({ type: 'HELIOS_SET_AUDIO_TRACK_VOLUME', trackId, volume }, '*');
      }
      setAudioTrackMuted(trackId, muted) {
        this.iframeWindow.postMessage({ type: 'HELIOS_SET_AUDIO_TRACK_MUTED', trackId, muted }, '*');
      }
    }
    ```
  - In `packages/player/src/bridge.ts`:
    ```typescript
    // Inside connectToParent message listener switch:
    case 'HELIOS_SET_AUDIO_TRACK_VOLUME':
      if (typeof data.volume === 'number' && typeof data.trackId === 'string') {
        helios.setAudioTrackVolume(data.trackId, data.volume);
      }
      break;
    case 'HELIOS_SET_AUDIO_TRACK_MUTED':
      if (typeof data.muted === 'boolean' && typeof data.trackId === 'string') {
        helios.setAudioTrackMuted(data.trackId, data.muted);
      }
      break;
    ```
- **Public API Changes**:
  - `HeliosController` interface gains two new methods.
  - Bridge protocol gains two new message types.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm run build -w packages/player` to ensure strict type compliance.
  - Run `npm test -w packages/player` to execute the updated test suite.
- **Success Criteria**:
  - Build succeeds without type errors.
  - Tests in `controllers.test.ts` pass, confirming message dispatch and method delegation.
  - Tests in `api_parity.test.ts` pass, confirming the mock aligns with the interface.
- **Edge Cases**:
  - `trackId` does not exist (handled gracefully by Core, Bridge just passes the message).
  - Invalid types for volume/muted (checked by typeof guards in Bridge).
