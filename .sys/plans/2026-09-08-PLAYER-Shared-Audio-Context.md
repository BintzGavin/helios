# 2026-09-08 - PLAYER - Shared Audio Context

#### 1. Context & Goal
- **Objective**: Implement a Shared Audio Context Manager to prevent audio hijacking issues where disposing the AudioMeter silences the media element permanently.
- **Trigger**: Critical Learning in `.jules/PLAYER.md` and analysis of `AudioMeter.dispose()` showing `ctx.close()`.
- **Impact**: Enables robust audio metering in Direct Mode previews without breaking audio playback when the player is unmounted or reloaded.

#### 2. File Inventory
- **Create**: `packages/player/src/features/audio-context-manager.ts` (Implement SharedAudioContextManager singleton)
- **Modify**: `packages/player/src/features/audio-metering.ts` (Update AudioMeter to use manager)
- **Modify**: `packages/player/src/features/audio-metering.test.ts` (Update tests to verify persistence)
- **Read-Only**: `packages/player/src/index.ts`, `packages/player/src/controllers.ts`

#### 3. Implementation Spec
- **Architecture**: Singleton Pattern for `SharedAudioContextManager`. It maintains a `WeakMap<HTMLMediaElement, SharedAudioSource>`.
- **Pseudo-Code**:
  ```typescript
  class SharedAudioContextManager {
    private ctx: AudioContext;
    private sources: WeakMap<HTMLMediaElement, SharedAudioSource>;
    static getInstance(): SharedAudioContextManager;
    getSharedSource(element): SharedAudioSource;
  }

  class SharedAudioSource {
    constructor(element, context);
    connect(node); // connects to metering node
    disconnect(node); // disconnects metering node
    // Manages internal source -> gain -> destination graph
    // Manages volume listener
  }
  ```
- **Public API Changes**: None (Internal feature). `AudioMeter` API remains same but behaves differently (doesn't close context).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - `audio-metering.test.ts` passes.
  - New tests verify `AudioContext` is not closed on `AudioMeter.dispose()`.
  - Multiple `AudioMeter`s can attach/detach from same element.
- **Edge Cases**:
  - Element removed from DOM (WeakMap handles GC).
  - Context suspended/resumed.
