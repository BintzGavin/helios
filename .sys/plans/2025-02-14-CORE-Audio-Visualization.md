# CORE: Audio Visualization Hooks

#### 1. Context & Goal
- **Objective**: Implement `getAudioContext()` and `getAudioSourceNode(trackId)` in the `Helios` core and `DomDriver`.
- **Trigger**: Vision Gap identified from `packages/core/README.md` and `.jules/CORE.md`. The journal mentions these hooks as necessary for visualization, but they are missing from the codebase.
- **Impact**: Unlocks the ability for consumers to visualize audio (e.g., waveforms, frequency bars) by tapping into the Web Audio graph managed by Helios, without breaking the internal state or "stealing" the audio element.

#### 2. File Inventory
- **Modify**:
  - `packages/core/src/drivers/TimeDriver.ts`: Update interface to include optional methods.
  - `packages/core/src/drivers/DomDriver.ts`: Implement the logic using `WeakMap` for caching.
  - `packages/core/src/drivers/NoopDriver.ts`: Add stubs returning `undefined`.
  - `packages/core/src/Helios.ts`: Expose public API methods.
- **Create**:
  - `packages/core/src/drivers/DomDriver-audio.test.ts`: New test file for verification.
- **Read-Only**:
  - `packages/core/src/drivers/index.ts` (Ensure exports are correct)

#### 3. Implementation Spec

**Architecture**:
- **Interface Extension**: `TimeDriver` gains two optional methods returning `unknown` (to maintain isomorphism).
- **Lazy Initialization**: `DomDriver` initializes `AudioContext` only when requested.
- **Source Node Caching**: `DomDriver` uses a `WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>` to ensure 1:1 mapping (browsers throw error if multiple sources are created for one element).
- **Default Connection**: When `DomDriver` creates a source node, it must connect it to `destination` so audio continues to play normally.

**Public API Changes**:
- `Helios.getAudioContext(): unknown`
- `Helios.getAudioSourceNode(trackId: string): unknown`

**Pseudo-Code (TimeDriver.ts)**:
```typescript
interface TimeDriver {
  // ... existing methods
  getAudioContext?(): unknown;
  getAudioSourceNode?(trackId: string): unknown;
}
```

**Pseudo-Code (DomDriver.ts)**:
```typescript
class DomDriver implements TimeDriver {
  private audioContext: AudioContext | null = null;
  private sourceNodes = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

  getAudioContext(): unknown {
    if (!this.audioContext && typeof AudioContext !== 'undefined') {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  getAudioSourceNode(trackId: string): unknown {
    // 1. Find the element in this.mediaElements using trackId
    // 2. If not found, return undefined
    // 3. Check cache (this.sourceNodes)
    // 4. If cached, return it
    // 5. If not cached:
    //    - Ensure this.audioContext exists
    //    - Create source = ctx.createMediaElementSource(el)
    //    - Connect source -> ctx.destination (CRITICAL: preserve playback)
    //    - Cache source
    //    - Return source
  }
}
```

**Pseudo-Code (Helios.ts)**:
```typescript
class Helios {
  public getAudioContext(): unknown {
    return this.driver.getAudioContext?.();
  }
  public getAudioSourceNode(trackId: string): unknown {
    return this.driver.getAudioSourceNode?.(trackId);
  }
}
```

#### 4. Test Plan
- **Verification**: `npm test -w packages/core packages/core/src/drivers/DomDriver-audio.test.ts`
- **Success Criteria**:
  1. `getAudioContext()` returns a valid `AudioContext`.
  2. `getAudioSourceNode(id)` returns a `MediaElementAudioSourceNode`.
  3. Repeated calls return the *same* node instance (caching works).
  4. The returned node is connected to destination (spy on `connect`).
- **Edge Cases**:
  - Calling in Node.js environment (should return undefined/noop).
  - Calling with invalid track ID (should return undefined).
  - Calling when `DomDriver` is not active (should return undefined).
