# Context & Goal
- **Objective**: Implement reactive audio fading in the player preview to support metadata-driven fades and dynamically added media elements.
- **Trigger**: "Vision Gap" - Audio fades defined in `Helios` state (metadata) work in Export but are ignored in Preview. Dynamically added audio elements (e.g., via React) are also ignored by the current `AudioFader` which only scans the DOM once on connect.
- **Impact**: Ensures WYSIWYG parity between Preview and Export for audio fades, and robustly handles dynamic compositions.

# File Inventory
- **Modify**: `packages/player/src/features/audio-fader.ts` (Implement reactivity and metadata support)
- **Modify**: `packages/player/src/features/audio-fader.test.ts` (Add tests for new functionality)
- **Modify**: `packages/player/src/bridge.ts` (Pass state updates to fader in `connectToParent`)
- **Modify**: `packages/player/src/controllers.ts` (Pass state updates to fader in `DirectController`)
- **Read-Only**: `packages/player/src/features/audio-utils.ts` (Reference ID extraction logic)

# Implementation Spec
- **Architecture**:
  - Update `AudioFader` class to maintain a live registry of media elements using `MutationObserver`.
  - Introduce `updateAudioTracks(tracks: AudioTrackMetadata[])` to sync metadata from `Helios` state.
  - Implement fade calculation logic that prioritizes metadata configuration over DOM attributes (`data-helios-fade-*`).

- **Pseudo-Code**:
  ```typescript
  class AudioFader {
    private metadata = new Map<string, AudioTrackMetadata>();
    private observer: MutationObserver | null = null;
    private elements = new Set<HTMLMediaElement>(); // Track all media elements

    connect(doc: Document) {
       // 1. Initial Scan
       doc.querySelectorAll('audio, video').forEach(el => this.registerElement(el));

       // 2. Setup MutationObserver
       this.observer = new MutationObserver((mutations) => {
          mutations.forEach(m => {
             m.addedNodes.forEach(node => {
                if (node.nodeName === 'AUDIO' || node.nodeName === 'VIDEO') this.registerElement(node);
                // Also handle subtree if needed (e.g. nested in div)
             });
             m.removedNodes.forEach(node => {
                if (node.nodeName === 'AUDIO' || node.nodeName === 'VIDEO') this.unregisterElement(node);
             });
          });
       });
       this.observer.observe(doc.body, { childList: true, subtree: true });
    }

    updateAudioTracks(tracks: AudioTrackMetadata[]) {
       this.metadata.clear();
       tracks.forEach(t => this.metadata.set(t.id, t));
       // Re-evaluate managed sources if needed
    }

    private loop = () => {
       this.elements.forEach(el => {
          // Resolve ID: data-helios-track-id || id || track-{index}
          // Lookup metadata fade config
          // Fallback to DOM attributes
          // Calculate gain based on currentTime
          // Apply gain to SharedAudioSource
       });
       requestAnimationFrame(this.loop);
    }
  }
  ```

- **Public API Changes**:
  - `AudioFader.updateAudioTracks(tracks: AudioTrackMetadata[])` (new method)

- **Dependencies**:
  - Depends on `AudioTrackMetadata` interface from `@helios-project/core` (available via imports).
  - Depends on `SharedAudioContextManager` (existing).

# Test Plan
- **Verification**: Run unit tests for `AudioFader`.
  - Command: `npm test -w packages/player src/features/audio-fader.test.ts`
- **Success Criteria**:
  - Existing tests pass.
  - New test `should prioritize metadata fades over attributes` passes.
  - New test `should detect dynamically added audio elements` passes.
- **Edge Cases**:
  - Element removed from DOM -> `AudioFader` should stop tracking it (handled by MutationObserver removal logic).
  - Metadata ID collision -> Metadata overrides attribute-based configuration for matching ID.
  - No metadata provided -> Fallback to attributes working as before.
