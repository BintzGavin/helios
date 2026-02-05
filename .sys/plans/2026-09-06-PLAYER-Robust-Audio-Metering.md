# 2026-09-06-PLAYER-Robust-Audio-Metering.md

#### 1. Context & Goal
- **Objective**: Refactor `AudioMeter` to support non-destructive toggling of audio metering without interrupting playback or causing silence.
- **Trigger**: Discovery that `AudioMeter.dispose()` closes the `AudioContext` and disconnects `MediaElementAudioSourceNode`s, which permanently silences the audio elements because they cannot be easily reconnected to the default destination once "hijacked" by the Web Audio API.
- **Impact**: Enables robust "Diagnostics" and "Metering" features that can be turned on/off safely during a session. Prevents user-facing bugs where audio cuts out after stopping metering.

#### 2. File Inventory
- **Modify**: `packages/player/src/features/audio-metering.ts` (Refactor lifecycle methods)
- **Modify**: `packages/player/src/controllers.ts` (Update `DirectController` to manage `AudioMeter` persistence)
- **Modify**: `packages/player/src/bridge.ts` (Update Bridge logic to manage `AudioMeter` persistence)
- **Create**: `packages/player/src/features/audio-metering.test.ts` (New test file)

#### 3. Implementation Spec

**Architecture:**
- The `AudioMeter` class currently uses a "create-and-destroy" pattern. Because it uses `createMediaElementSource` (which re-routes audio from the element), destroying the `AudioContext` breaks the audio path.
- The new pattern will be "create-once, toggle-enable". The `AudioMeter` (and its `AudioContext`) will persist for the lifecycle of the `HeliosController`.
- "Stopping" metering will simply disconnect the analyzer graph (saving processing) while keeping the pass-through gain node connected to `destination` (preserving playback).

**Pseudo-Code:**

```typescript
// packages/player/src/features/audio-metering.ts

class AudioMeter {
  // ... existing props
  private isEnabled: boolean = false;

  constructor() {
    // Create Context and Nodes (Splitter, Analysers)
    // Connect Splitter -> Analysers (Permanent)
  }

  connect(doc) {
    // 1. Find all media elements
    // 2. If new element:
    //    - Create MediaElementSource
    //    - Create GainNode (for volume sync)
    //    - Connect Source -> Gain -> Destination (Pass-through Path)
    //    - If this.isEnabled: Connect Source -> Splitter (Metering Path)
  }

  enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    // Connect all existing sources to Splitter (if not already)
    this.sources.forEach(source => {
        try { source.connect(this.splitter); } catch(e) {}
    });
  }

  disable() {
    if (!this.isEnabled) return;
    this.isEnabled = false;

    // Disconnect all existing sources from Splitter
    // (Pass-through path remains touched)
    this.sources.forEach(source => {
        try { source.disconnect(this.splitter); } catch(e) {}
    });
  }

  destroy() {
    // Final cleanup
    // Disconnect everything
    // Close Context
  }
}
```

**Controller / Bridge Logic:**
- `DirectController` and `bridge.ts` will hold a nullable `private audioMeter: AudioMeter | null`.
- `startAudioMetering()`:
  - If `!this.audioMeter`, create new `AudioMeter()`.
  - Call `this.audioMeter.connect(doc)` (to pick up any new elements).
  - Call `this.audioMeter.enable()`.
  - Start RAF loop.
- `stopAudioMetering()`:
  - Call `this.audioMeter.disable()`.
  - Stop RAF loop.
  - **DO NOT** call `destroy()` or set to null. Keep instance alive.
- `dispose()`:
  - Call `this.audioMeter.destroy()`.
  - Set to null.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Manual Verification Steps**:
  1. Load a composition with audio.
  2. Start playback (hear audio).
  3. Invoke `startAudioMetering()` (verify audio continues, meters update).
  4. Invoke `stopAudioMetering()` (verify audio continues, meters stop).
  5. Invoke `startAudioMetering()` again (verify audio continues, meters resume).
  6. Reload player (verify clean cleanup).
