# Context & Goal
- **Objective**: Implement Picture-in-Picture (PiP) support for Canvas-based compositions and integrate MediaSession API for system-level playback controls.
- **Trigger**: Missing standard video player capabilities (PiP, System Controls) and explicit architectural requirement from memory.
- **Impact**: Enables users to watch compositions while multitasking and control playback via hardware keys/OS UI. Bridges the gap towards a full-featured video player experience.

# File Inventory
- **Modify**: `packages/player/src/index.ts` (Implement PiP logic, MediaSession handlers, and UI updates)
- **Read-Only**: `packages/player/src/controllers.ts` (Reference for controller API)

# Implementation Spec
- **Architecture**:
  - **MediaSession**:
    - Add `media-title`, `media-artist`, and `media-artwork` attributes to `<helios-player>` for metadata.
    - Register action handlers (`play`, `pause`, `seekto`, `stop`) in `connectedCallback`.
    - Update `playbackState` and `setPositionState` (if supported) in `updateUI`.
  - **Picture-in-Picture**:
    - Add a hidden `<video>` element to the Shadow DOM.
    - Add a PiP toggle button to the controls (hidden if API unsupported).
    - Implement `requestPictureInPicture()`:
      - Locate the `<canvas>` element within the `iframe` (requires same-origin) or `document` (Direct mode).
      - Call `canvas.captureStream()` to get a MediaStream.
      - Assign stream to hidden video, play it, and request PiP.
      - Sync Play/Pause via `MediaSession` or video events.
    - Implement `enterpictureinpicture` and `leavepictureinpicture` events.
    - Expose `pictureInPictureElement` property.

- **Pseudo-Code**:
  ```typescript
  // In HeliosPlayer class
  class HeliosPlayer extends HTMLElement {
    // ...
    private pipVideo: HTMLVideoElement;

    connectedCallback() {
      // ...
      this.setupMediaSession();
    }

    setupMediaSession() {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('seekto', (details) => {
             if (details.seekTime) this.currentTime = details.seekTime;
        });
        // ...
      }
    }

    updateUI(state) {
      // ...
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = state.isPlaying ? 'playing' : 'paused';
        navigator.mediaSession.setPositionState({
          duration: state.duration,
          playbackRate: state.playbackRate,
          position: state.currentTime
        });
      }
    }

    async requestPictureInPicture() {
       // Check support
       // Find canvas (try direct, then iframe contentDocument)
       // stream = canvas.captureStream()
       // this.pipVideo.srcObject = stream
       // await this.pipVideo.play()
       // await this.pipVideo.requestPictureInPicture()
    }
  }
  ```

- **Public API Changes**:
  - New Attributes: `media-title`, `media-artist`, `media-artwork`.
  - New Methods: `requestPictureInPicture()`, `exitPictureInPicture()`.
  - New Property: `pictureInPictureElement`.
  - New Events: `enterpictureinpicture`, `leavepictureinpicture`.

- **Dependencies**: None.

# Test Plan
- **Verification**:
  - Run `npm run build -w packages/player`.
  - Use `tests/e2e/verify-player.ts` (or manual test) to load a Canvas-based composition (e.g., `examples/canvas-rendering`).
- **Success Criteria**:
  - PiP button is visible.
  - Clicking PiP opens floating video window.
  - Media keys (Play/Pause) control the player.
- **Edge Cases**:
  - DOM-based composition: PiP button should be disabled/hidden or show error.
  - Cross-origin iframe: PiP button should be disabled/hidden or show error.
