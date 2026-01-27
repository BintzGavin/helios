# Context & Goal
- **Objective**: Create `examples/audio-visualization` to demonstrate driving canvas animations using raw audio data (waveform/amplitude) synchronized with Helios.
- **Trigger**: Vision gap. "Use What You Know" implies using native APIs like Web Audio for visualizations, but no example exists. Users need to know how to sync audio data analysis with the frame loop.
- **Impact**: Unlocks "Music Video" use cases. Demonstrates deterministic audio visualization without external libraries.

# File Inventory
- **Create**:
  - `examples/audio-visualization/composition.html`: Main implementation using `AudioContext` and Canvas.
  - `examples/audio-visualization/vite.config.js`: Local development config.
- **Modify**:
  - `vite.build-example.config.js`: Add `audio_visualization` entry point for the build system.
  - `tests/e2e/verify-render.ts`: Add verification test case.
- **Read-Only**:
  - `packages/core/src/index.ts` (Import definitions)

# Implementation Spec
- **Architecture**:
  - **Synchronous Audio Generation**: Use `AudioContext.createBuffer` to generate a 10s audio clip (Sine wave sweep + Beat pulses) synchronously to avoid async decoding race conditions during headless rendering.
  - **Data Access**: In `helios.subscribe`, calculate the exact sample index corresponds to `currentFrame / fps`.
  - **Visualization**:
    - Draw a Waveform (Oscilloscope style) by plotting sample values.
    - Draw a "Volume Circle" scaled by the RMS amplitude of the current window.
  - **Integration**: Standard `Helios` instance with `bindToDocumentTimeline()`.
- **Pseudo-Code**:
  ```javascript
  // 1. Setup Audio Buffer synchronously
  const ctx = new AudioContext();
  const buffer = ctx.createBuffer(1, sampleRate * 10, sampleRate);
  const data = buffer.getChannelData(0);
  // Fill data with sine wave sweep and beats...

  // 2. Setup Helios
  const helios = new Helios({ fps: 30, duration: 10 });

  // 3. Draw Loop
  function draw(frame) {
    const time = frame / 30;
    const centerSample = Math.floor(time * sampleRate);
    const windowSize = 512;
    // Extract samples [centerSample - windowSize/2, centerSample + windowSize/2]
    // Draw Waveform Line
    // Calc RMS
    // Draw Circle(radius = rms * 100)
  }

  helios.subscribe(state => draw(state.currentFrame));
  ```
- **Dependencies**: None (Vanilla JS).

# Test Plan
- **Verification**:
  - Run `npm run build:examples` to ensure it builds.
  - Run `npx ts-node tests/e2e/verify-render.ts` to verify the render pipeline produces a video.
- **Success Criteria**:
  - Build succeeds.
  - `output/audio-visualization-render-verified.mp4` is generated.
  - Video contains a moving waveform and pulsating circle.
