# 2026-03-01-PLAYER-VolumeControls.md

#### 1. Context & Goal
- **Objective**: Implement audio volume and mute controls in the `<helios-player>` UI and extend the bridge protocol to support them.
- **Trigger**: Vision gap "UI controls" - Standard video players include volume control, and `Helios` core supports it, but the player currently lacks it.
- **Impact**: Enables users to control audio volume during preview, ensuring the "In-Browser Preview" matches the "Client-Side Audio Export" capabilities and providing a standard player experience.

#### 2. File Inventory
- **Modify**: `packages/player/src/controllers.ts` (Update interface and implementations)
- **Modify**: `packages/player/src/bridge.ts` (Add message handlers)
- **Modify**: `packages/player/src/index.ts` (Add UI elements and event logic)
- **Modify**: `packages/player/src/controllers.test.ts` (Add unit tests)

#### 3. Implementation Spec
- **Architecture**:
  - Extend `HeliosController` interface with `setAudioVolume` and `setAudioMuted`.
  - Update `DirectController` to call `helios.setAudioVolume/Muted`.
  - Update `BridgeController` to send `HELIOS_SET_VOLUME/MUTED` messages.
  - Update `connectToParent` in `bridge.ts` to listen for these messages and call the core methods.
  - Update `HeliosPlayer` UI to include a Mute button and Volume slider.
- **Pseudo-Code**:
  ```typescript
  // controllers.ts
  interface HeliosController {
    // ... existing
    setAudioVolume(volume: number): void;
    setAudioMuted(muted: boolean): void;
  }

  // bridge.ts
  // Listen for HELIOS_SET_VOLUME and HELIOS_SET_MUTED

  // index.ts
  // Add <button class="mute-btn"> and <input type="range" class="volume-slider">
  // Handle click/input events to call controller methods
  // Update button icon/state in updateUI() based on state.volume and state.muted
  ```
- **Public API Changes**:
  - `HeliosController` interface expanded (technically public export).
  - Bridge protocol expanded (internal detail).
  - No changes to `<helios-player>` attributes.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - Unit tests pass for `DirectController` and `BridgeController` calling/sending volume commands.
  - (Manual verification implied): Volume slider changes volume, Mute button toggles mute state.
- **Edge Cases**:
  - Volume 0 should behave like Mute.
  - Unmuting should restore previous volume.
