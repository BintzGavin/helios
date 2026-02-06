# 2025-02-14-PLAYER-DynamicAudioMetering

## 1. Context & Goal
- **Objective**: Implement dynamic audio element detection in `AudioMeter` using `MutationObserver`.
- **Trigger**: The current `AudioMeter` implementation only connects to audio/video elements present at initialization, missing any elements added dynamically by the composition scripts.
- **Impact**: Ensures accurate audio metering for dynamic compositions where media elements are created or inserted at runtime, improving the robustness of the audio visualization feature.

## 2. File Inventory
- **Modify**: `packages/player/src/features/audio-metering.ts` (Implement MutationObserver logic)
- **Create**: `packages/player/tests/features/audio-metering-dynamic.test.ts` (New test file for dynamic behavior)
- **Read-Only**: `packages/player/src/features/audio-context-manager.ts`

## 3. Implementation Spec
- **Architecture**: Utilize `MutationObserver` to monitor the document body for added or removed `HTMLMediaElement` nodes and their descendants.
- **Pseudo-Code**:
  ```typescript
  class AudioMeter {
    private observer: MutationObserver | null = null;

    connect(doc: Document) {
      // 1. Scan existing
      const elements = doc.querySelectorAll('audio, video');
      elements.forEach(el => this.connectElement(el));

      // 2. Setup Observer
      this.observer = new MutationObserver((mutations) => {
        mutations.forEach(m => {
          m.addedNodes.forEach(n => {
            if (n instanceof HTMLMediaElement) this.connectElement(n);
            if (n instanceof Element) {
               n.querySelectorAll('audio, video').forEach(c => this.connectElement(c));
            }
          });
          m.removedNodes.forEach(n => {
             if (n instanceof HTMLMediaElement) this.disconnectElement(n);
             if (n instanceof Element) {
               n.querySelectorAll('audio, video').forEach(c => this.disconnectElement(c));
             }
          });
        });
      });

      const target = doc.body || doc.documentElement;
      if (target) {
          this.observer.observe(target, {
            childList: true,
            subtree: true
          });
      }
    }

    private connectElement(el: HTMLMediaElement) {
       // Logic from existing connect() to get shared source and connect to splitter
       // Ensure we don't double connect
    }

    private disconnectElement(el: HTMLMediaElement) {
       // Logic to remove from sources map and disconnect from splitter
    }

    dispose() {
      this.observer?.disconnect();
      this.observer = null;
      // ... existing cleanup
    }
  }
  ```
- **Public API Changes**: None (internal implementation detail).
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npx vitest run packages/player/tests/features/audio-metering-dynamic.test.ts`
- **Success Criteria**:
  - Test confirms `connectElement` is called when an `<audio>` tag is appended to the document body.
  - Test confirms `disconnectElement` is called when an `<audio>` tag is removed.
  - Test confirms nested audio elements (inside a `div`) are also detected.
  - Verify that `dispose()` cleans up the observer.
- **Edge Cases**:
  - Adding a container `div` with multiple `audio` elements inside.
  - Removing a container `div` with multiple `audio` elements inside.
  - Ensure no errors if `doc.body` is missing (though unlikely in browser).
