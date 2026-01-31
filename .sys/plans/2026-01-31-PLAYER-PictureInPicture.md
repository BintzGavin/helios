# Plan: Implement Picture-in-Picture Support

#### 1. Context & Goal
- **Objective**: Implement `requestPictureInPicture` API and a UI toggle button for the `<helios-player>` Web Component.
- **Trigger**: Vision gap in "Standard Media API Parity" and "Native Always Wins" philosophy; users expect modern video players to support "pop-out" preview.
- **Impact**: Enables a "pop-out" workflow for developers (coding while watching preview) and aligns `HeliosPlayer` with standard `HTMLVideoElement` capabilities.

#### 2. File Inventory
- **Create**:
  - `packages/player/src/features/pip.test.ts` (Unit tests for PiP logic)
- **Modify**:
  - `packages/player/src/index.ts` (Implement PiP logic, UI button, and API method)
- **Read-Only**:
  - `packages/player/src/controllers.ts` (Reference for Controller types)

#### 3. Implementation Spec
- **Architecture**:
  - **Hidden Video Proxy**: Since `HeliosPlayer` renders via an iframe (which may contain Canvas or DOM), and the Picture-in-Picture API requires a `<video>` element, we will create a hidden `<video>` element within the `HeliosPlayer`'s Shadow DOM.
  - **Stream Capture**: When PiP is requested, we will attempt to capture a `MediaStream` from the composition's `<canvas>` using `canvas.captureStream(fps)`.
  - **Direct Mode Constraint**: This feature primarily supports "Direct Mode" (same-origin iframe or no iframe) where the `HeliosPlayer` can access the `contentDocument` to find the canvas. If access is denied (Cross-Origin Bridge Mode), the feature will gracefully fail or warn.
  - **Synchronization**: The hidden video will act as a proxy. When the PiP window is paused/played by the user, we must sync this state back to the `HeliosController`.

- **Pseudo-Code**:
  ```typescript
  // packages/player/src/index.ts

  export class HeliosPlayer extends HTMLElement {
    // ...
    private pipVideo: HTMLVideoElement;
    private pipBtn: HTMLButtonElement;

    constructor() {
      // ...
      // 1. Create hidden video element
      this.pipVideo = document.createElement('video');
      this.pipVideo.style.cssText = 'position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none;';
      this.pipVideo.autoplay = true;
      this.pipVideo.muted = true; // Required for autoplay; we rely on main player for audio?
      // Actually, if we want audio in PiP, we might need to capture audio track too.
      // But Helios audio uses WebAudio/AudioContext often.
      // For MVP, visual-only PiP is acceptable, or we let main window handle audio.

      this.pipVideo.addEventListener('enterpictureinpicture', this.onEnterPip);
      this.pipVideo.addEventListener('leavepictureinpicture', this.onLeavePip);
      this.pipVideo.addEventListener('play', () => this.controller?.play());
      this.pipVideo.addEventListener('pause', () => this.controller?.pause());

      // 2. Add PiP Button to Controls (right of Fullscreen or Scrubber)
      this.pipBtn = document.createElement('button');
      this.pipBtn.className = 'pip-btn';
      this.pipBtn.innerHTML = '⏏'; // Or SVG icon
      // ...
    }

    public async requestPictureInPicture(): Promise<PictureInPictureWindow> {
      // 1. Check support
      if (!document.pictureInPictureEnabled) throw new Error('PiP not supported');

      // 2. Check Controller / Access
      // Must be able to access iframe content
      let canvas: HTMLCanvasElement | null = null;
      try {
        const doc = this.iframe.contentDocument || (this.iframe.contentWindow as any)?.document;
        if (!doc) throw new Error('Cannot access iframe content');

        // Use 'canvas-selector' attribute or default to 'canvas'
        const selector = this.getAttribute('canvas-selector') || 'canvas';
        canvas = doc.querySelector(selector);
      } catch (e) {
        throw new Error('Picture-in-Picture is only available for local/same-origin compositions.');
      }

      if (!canvas) throw new Error('No canvas found for Picture-in-Picture.');

      // 3. Capture Stream
      const fps = this.fps || 30;
      const stream = canvas.captureStream(fps);
      this.pipVideo.srcObject = stream;

      // 4. Play and Request PiP
      await this.pipVideo.play();
      return this.pipVideo.requestPictureInPicture();
    }

    // Toggle Handler
    private togglePip() {
       if (document.pictureInPictureElement) {
         document.exitPictureInPicture();
       } else {
         this.requestPictureInPicture().catch(e => {
            console.warn('HeliosPlayer: PiP failed', e);
            // Show error in UI?
         });
       }
    }
  }
  ```

- **Public API Changes**:
  - `requestPictureInPicture(): Promise<PictureInPictureWindow>`
  - `pip` getter (readonly, returns boolean if active?) - *Optional*
  - Events: `enterpictureinpicture`, `leavepictureinpicture` (bubbled from internal video)

- **Dependencies**:
  - Requires `canvas.captureStream` (Standard in modern browsers).
  - No external npm packages.

#### 4. Test Plan
- **Verification**:
  - Run `npm run build -w packages/player`.
  - Execute `npx vitest run packages/player/src/features/pip.test.ts` (New test file).

- **Unit Test Strategy (`pip.test.ts`)**:
  - Use `jsdom` environment.
  - Mock `HTMLCanvasElement.prototype.captureStream`.
  - Mock `HTMLVideoElement.prototype.requestPictureInPicture`.
  - Mock `document.pictureInPictureEnabled`.
  - Instantiate `HeliosPlayer`.
  - Trigger `requestPictureInPicture()` and assert mocks are called.
  - Assert `enterpictureinpicture` event updates UI state (button active class).

- **Success Criteria**:
  - `npm run build` passes.
  - Unit tests pass.
  - (Manual) In a browser, clicking the PiP button on a Canvas composition pops out the video.

- **Edge Cases**:
  - **DOM Composition**: `canvas` not found -> Method throws helpful error.
  - **Cross-Origin**: `iframe` access fails -> Method throws helpful error.
  - **Firefox**: `captureStream` might need prefix or config (standard is `captureStream`). Test with standard API.
