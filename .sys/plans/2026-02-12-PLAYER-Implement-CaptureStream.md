#### 1. Context & Goal
- **Objective**: Implement `captureStream()` on `<helios-player>` to expose a real-time `MediaStream` of the composition.
- **Trigger**: Vision gap - `HTMLMediaElement` parity requires `captureStream`, enabling standard integrations (WebRTC, Recorder).
- **Impact**: Unlocks live streaming and recording capabilities for developers embedding Helios.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/player/src/index.ts`: Add `captureStream` method to `HeliosPlayer` class.
  - `packages/player/src/index.test.ts`: Add unit tests for the new method.
- **Read-Only**:
  - `packages/player/src/controllers.ts`: To understand controller state access.

#### 3. Implementation Spec
- **Architecture**:
  - The `HeliosPlayer` web component will implement a `captureStream(fps?: number): MediaStream` method, mirroring `HTMLCanvasElement.captureStream`.
  - This method serves as a facade, attempting to locate the composition's internal `<canvas>` element within the iframe.
  - It enforces security constraints: if the iframe is cross-origin, it must throw a `SecurityError` (DOMException).
  - It enforces mode constraints: if `export-mode="dom"`, it must throw a `NotSupportedError`.
- **Pseudo-Code**:
  ```typescript
  class HeliosPlayer extends HTMLElement {
    public captureStream(fps?: number): MediaStream {
      // 1. Check export-mode. If "dom", throw NotSupportedError.
      // 2. Try to access this.iframe.contentDocument.
      //    - If access fails (SecurityError) or null, throw SecurityError.
      // 3. Find canvas using "canvas-selector" attribute or default "canvas".
      //    - If not found, throw InvalidStateError.
      // 4. Call canvas.captureStream(fps || this.fps || 30).
      // 5. Return the stream.
    }
  }
  ```
- **Public API Changes**:
  - New public method `captureStream(fps?: number): MediaStream` on `HeliosPlayer`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/player`
- **Success Criteria**:
  - `captureStream()` returns a `MediaStream` object when the player is in canvas mode and same-origin.
  - `captureStream(60)` passes the frame rate to the internal canvas capture.
- **Edge Cases**:
  - **Cross-Origin**: Must throw `SecurityError` (not crash).
  - **DOM Mode**: Must throw `NotSupportedError`.
  - **Not Loaded**: Must throw `InvalidStateError`.
