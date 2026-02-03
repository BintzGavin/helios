# Plan: Enable Audio Visualization Hooks

#### 1. Context & Goal
- **Objective**: Expose `getAudioContext()` and `getAudioSourceNode(trackId)` in the `Helios` and `TimeDriver` APIs.
- **Trigger**: Vision gap identified in `docs/status/CORE.md` - current `DomDriver` encapsulates media elements, preventing consumers from attaching Web Audio API nodes for visualization.
- **Impact**: Enables real-time audio visualization (waveforms, frequency bars) in Helios-powered applications without breaking the existing playback pipeline.

#### 2. File Inventory
- **Modify**:
  - `packages/core/src/drivers/TimeDriver.ts`: Update interface definition.
  - `packages/core/src/drivers/DomDriver.ts`: Implement `AudioContext` management and source node creation.
  - `packages/core/src/drivers/NoopDriver.ts`: Implement no-op stubs.
  - `packages/core/src/Helios.ts`: Expose public methods delegating to the driver.
- **Read-Only**:
  - `packages/core/src/drivers/index.ts`

#### 3. Implementation Spec

**Architecture**:
- **Lazy Initialization**: `DomDriver` will only create an `AudioContext` when requested to avoid unnecessary overhead for simple video playback.
- **Graph Management**: When `getAudioSourceNode(trackId)` is called:
  1. `DomDriver` ensures an `AudioContext` exists.
  2. It locates the `HTMLMediaElement` associated with the `trackId`.
  3. It checks a cache (`Map<HTMLMediaElement, MediaElementAudioSourceNode>`) for an existing source node.
  4. If missing, it creates a new `MediaElementAudioSourceNode` and **connects it to `destination`** immediately. This ensures audio playback continues uninterrupted (the default behavior) while allowing the consumer to fan-out the source to their own analyzer nodes.
- **Isomorphism**: All methods return `unknown` (or nullable types) to ensure compatibility with Node.js/headless environments where Web Audio API is missing.

**Public API Changes**:
- **`TimeDriver` Interface**:
  ```typescript
  getAudioContext(): unknown; // Returns AudioContext | null
  getAudioSourceNode(trackId: string): unknown; // Returns MediaElementAudioSourceNode | null
  ```
- **`Helios` Class**:
  ```typescript
  public getAudioContext(): unknown;
  public getAudioSourceNode(trackId: string): unknown;
  ```

**Pseudo-Code**:

**DomDriver.ts**:
```typescript
class DomDriver {
  private audioContext: AudioContext | null = null;
  private sourceNodes = new Map<HTMLMediaElement, MediaElementAudioSourceNode>();

  getAudioContext() {
    if (!this.audioContext && typeof AudioContext !== 'undefined') {
      this.audioContext = new AudioContext();
    }
    // Fallback for Webkit
    if (!this.audioContext && typeof (window as any).webkitAudioContext !== 'undefined') {
       this.audioContext = new (window as any).webkitAudioContext();
    }
    return this.audioContext;
  }

  getAudioSourceNode(trackId) {
    const element = this.findElement(trackId);
    if (!element) return null;

    if (!this.sourceNodes.has(element)) {
      const ctx = this.getAudioContext() as AudioContext;
      if (!ctx) return null;

      const source = ctx.createMediaElementSource(element);
      source.connect(ctx.destination); // Maintain default playback
      this.sourceNodes.set(element, source);
    }
    return this.sourceNodes.get(element);
  }
}
```

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **New Tests**: Create `packages/core/src/drivers/DomDriver-audio.test.ts`:
  - Verify `getAudioContext` returns a mock context.
  - Verify `getAudioSourceNode` calls `createMediaElementSource` and `connect` on the mock context.
  - Verify repeated calls return the same cached node.
- **Success Criteria**: Tests pass, confirming the API is exposed and logic flows correctly without runtime errors in Node.js or browser mocks.
