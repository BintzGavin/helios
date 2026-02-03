# 2026-08-09-CORE-enable-audio-state-persistence.md

#### 1. Context & Goal
- **Objective**: Add `audioTracks` to `HeliosOptions` to enable initialization of audio mixer state (volume/muted per track) via the constructor.
- **Trigger**: Vision gap "Headless State Machine" requires full state persistence, but `audioTracks` mixer state cannot currently be restored when re-creating a `Helios` instance (found during gap analysis).
- **Impact**: Enables full session save/load functionality for applications like Helios Studio, ensuring audio mixing settings are preserved. This bridges the gap between the "Headless State Machine" vision and the current inability to serialize/deserialize the full mixer state.

#### 2. File Inventory
- **Modify**: `packages/core/src/Helios.ts` (Add `audioTracks` to `HeliosOptions` and use it in constructor)
- **Read-Only**: `packages/core/src/drivers/TimeDriver.ts` (Interface definition)
- **Create**: `packages/core/src/audio-state.test.ts` (New test file)

#### 3. Implementation Spec
- **Architecture**: Update the `Helios` class to accept an optional `audioTracks` record in its configuration object (`HeliosOptions`). This value will be used to initialize the `_audioTracks` signal in the constructor, allowing the mixer state to be hydrated from an external source (e.g., a saved project file).
- **Pseudo-Code**:
  ```typescript
  // In packages/core/src/Helios.ts

  export interface HeliosOptions<TInputProps = Record<string, any>> {
    // ... existing options
    audioTracks?: Record<string, AudioTrackState>;
  }

  // In Helios constructor
  constructor(options: HeliosOptions<TInputProps>) {
    // ... existing validation

    // Initialize signals
    // Use options.audioTracks or default to empty object
    // Note: AudioTrackState values (volume/muted) are simple types, no complex validation needed beyond basic type check if strictly enforced,
    // but Typescript handles the contract.
    this._audioTracks = signal(options.audioTracks || {});

    // ... existing initialization
  }
  ```
- **Public API Changes**: `HeliosOptions` gains `audioTracks?: Record<string, AudioTrackState>`. This is a non-breaking additive change.
- **Dependencies**:
  - **CRITICAL**: The workspace is currently broken due to `packages/studio` depending on `@helios-project/player@^0.59.0` while `packages/player` is at `0.62.0`. This causes `npm install` to fail. This MUST be fixed (by another agent or manually) before verification can run.

#### 4. Test Plan
- **Verification**: `cd packages/core && npx vitest run src/audio-state.test.ts`
- **Success Criteria**:
  - The new test `packages/core/src/audio-state.test.ts` passes.
  - The test should verify that:
    1.  `Helios` initialized with `audioTracks` has the correct `state.audioTracks` values.
    2.  `Helios` initialized without `audioTracks` defaults to `{}`.
- **Edge Cases**:
  - Passing `undefined` or `null` (if allowed by TS) -> should default to `{}`.
  - Passing extra keys in `AudioTrackState` -> should be preserved (as it's a Record).
