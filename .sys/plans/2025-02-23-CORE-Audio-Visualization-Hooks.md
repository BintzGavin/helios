# Spec: Audio Visualization Hooks

#### 1. Context & Goal
- **Objective**: Expose `AudioContext` and `MediaElementAudioSourceNode` from the driver to enable real-time audio visualization without asset re-fetching.
- **Trigger**: Developers (and internal examples) currently have to fetch audio assets separately to visualize them, leading to code duplication, bandwidth waste, and synchronization headaches.
- **Impact**: Enables simple, efficient audio visualization in `packages/core` consumers (like `packages/player` or custom demos) by tapping into the existing playback pipeline.

#### 2. File Inventory
- **Modify**: `packages/core/src/drivers/TimeDriver.ts` (Add optional methods to interface)
- **Modify**: `packages/core/src/drivers/DomDriver.ts` (Implement methods with lazy loading)
- **Modify**: `packages/core/src/Helios.ts` (Expose methods via public API)
- **Create**: `packages/core/src/drivers/DomDriver-audio.test.ts` (Verify new audio logic)

#### 3. Implementation Spec
- **Architecture**:
  - Update `TimeDriver` interface to optionally expose `getAudioContext()` and `getAudioSourceNode(trackId)`.
  - `DomDriver` lazily creates a shared `AudioContext` (handling browser compatibility) and manages `MediaElementAudioSourceNode` creation/caching.
  - `Helios` delegates these calls to the driver, providing a unified API surface.
- **Pseudo-Code**:
  ```typescript
  // TimeDriver.ts
  export interface TimeDriver {
    // ... existing methods
    getAudioContext?(): Promise<unknown>; // Returns AudioContext
    getAudioSourceNode?(trackId: string): Promise<unknown>; // Returns MediaElementAudioSourceNode
  }

  // DomDriver.ts
  private audioContext: AudioContext | null = null;
  private sourceNodes = new Map<string, MediaElementAudioSourceNode>();

  async getAudioContext() {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    }
    return this.audioContext;
  }

  async getAudioSourceNode(trackId: string) {
    const ctx = await this.getAudioContext();
    if (!ctx) return null;

    // Check cache
    if (this.sourceNodes.has(trackId)) return this.sourceNodes.get(trackId);

    // Find element by trackId (iterate mediaElements)
    // If found:
    //   const source = ctx.createMediaElementSource(el);
    //   source.connect(ctx.destination); // Ensure it still plays!
    //   this.sourceNodes.set(trackId, source);
    //   return source;

    return null;
  }

  // Helios.ts
  public async getAudioContext(): Promise<unknown> {
    return this.driver.getAudioContext?.() ?? null;
  }

  public async getAudioSourceNode(trackId: string): Promise<unknown> {
    return this.driver.getAudioSourceNode?.(trackId) ?? null;
  }
  ```
- **Public API Changes**: `Helios` gains `getAudioContext()` and `getAudioSourceNode(trackId)` methods.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test packages/core/src/drivers/DomDriver-audio.test.ts`
- **Success Criteria**:
  - `getAudioContext` returns a valid context (mocked in test).
  - `getAudioSourceNode` returns a node connected to the correct media element.
  - Subsequent calls return the same cached node.
- **Edge Cases**:
  - Track ID not found (return null).
  - Node environment (methods undefined or return null).
  - Browser without AudioContext support.
