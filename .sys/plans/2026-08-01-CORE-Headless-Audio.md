# Spec: Headless Audio Tracks

## 1. Context & Goal
- **Objective**: Enable manual injection of audio track metadata into Helios state for headless (non-DOM) environments.
- **Trigger**: Vision gap identified—"Headless Logic Engine" requires full state reconstruction without DOM dependencies, but currently `availableAudioTracks` can only be populated by `DomDriver`.
- **Impact**: Unlocks strictly headless usage (e.g., CLI rendering, Node.js composition generation) where audio metadata is known but no DOM exists to discover it.

## 2. File Inventory
- **Create**:
  - `packages/core/src/headless-audio.test.ts`: Unit tests for headless audio track injection.
- **Modify**:
  - `packages/core/src/Helios.ts`: Update `HeliosOptions` and `Helios` class.
- **Read-Only**:
  - `packages/core/src/drivers/TimeDriver.ts`: Reference for `AudioTrackMetadata`.

## 3. Implementation Spec
- **Architecture**: Extend `Helios` class to accept audio metadata in constructor and via setter, treating it as explicit state similar to `captions`.
- **Pseudo-Code**:
  ```typescript
  // packages/core/src/Helios.ts

  export interface HeliosOptions {
    // ... existing options
    availableAudioTracks?: AudioTrackMetadata[]; // Add this
  }

  export class Helios {
    constructor(options) {
      // ... existing init
      // Initialize signal with provided tracks or empty array
      this._availableAudioTracks = signal(options.availableAudioTracks || []);

      // ... driver subscription logic remains (driver updates will overwrite this if they emit)
    }

    // Add public setter
    public setAvailableAudioTracks(tracks: AudioTrackMetadata[]) {
      this._availableAudioTracks.value = tracks;
    }
  }
  ```
- **Public API Changes**:
  - `HeliosOptions`: New optional property `availableAudioTracks: AudioTrackMetadata[]`.
  - `Helios` class: New method `setAvailableAudioTracks(tracks: AudioTrackMetadata[]): void`.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test -w packages/core packages/core/src/headless-audio.test.ts`
- **Success Criteria**:
  1. `Helios` initialized with `availableAudioTracks` exposes them in `state.availableAudioTracks`.
  2. `setAvailableAudioTracks` updates `state.availableAudioTracks`.
  3. `DomDriver` (if used) takes precedence if it emits metadata (ensuring DOM source of truth when attached).
- **Edge Cases**:
  - Passing `undefined` or `null` to setter (should be handled or typed out).
  - Calling setter while `DomDriver` is active (Driver might overwrite on next update, which is expected behavior).
