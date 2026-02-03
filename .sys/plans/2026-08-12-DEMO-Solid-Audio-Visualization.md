# 2026-08-12-DEMO-Solid-Audio-Visualization.md

#### 1. Context & Goal
- **Objective**: Create a SolidJS example demonstrating real-time audio analysis (RMS and waveform) using synthesized `AudioBuffer` and Helios.
- **Trigger**: Vision gap - `README.md` promises support for all frameworks, and we recently added Audio Visualization for React, Vue, and Svelte, but SolidJS is missing.
- **Impact**: Completes the "Audio Visualization" suite across all supported frameworks, proving Helios's framework-agnostic architecture.

#### 2. File Inventory
- **Create**:
  - `examples/solid-audio-visualization/composition.html`: Entry point.
  - `examples/solid-audio-visualization/src/index.jsx`: Mounts the App.
  - `examples/solid-audio-visualization/src/App.jsx`: Main logic (buffer synthesis, canvas rendering).
  - `examples/solid-audio-visualization/src/lib/createHeliosSignal.js`: Helper to bind Helios state to a Solid signal.
  - `examples/solid-audio-visualization/src/lib/useAudioData.js`: Helper to derive audio data from buffer and time.
  - `examples/solid-audio-visualization/vite.config.js`: Vite configuration.
- **Modify**:
  - `vite.build-example.config.js`: Add `solid-audio-visualization` to the SolidJS plugin include regex (and ensure React excludes it) to prevent JSX parsing conflicts.
- **Read-Only**:
  - `examples/react-audio-visualization/src/App.jsx`: Reference logic for audio synthesis.

#### 3. Implementation Spec
- **Architecture**:
  - **Framework**: SolidJS (using Signals, Effects, and Memos).
  - **State Management**:
    - `createHeliosSignal`: Subscribes to Helios updates and exposes state as a Signal.
    - `useAudioData`: A Memo that re-computes RMS/waveform only when the frame changes.
  - **Rendering**:
    - `createEffect`: Side-effect that draws to the Canvas whenever `audioData` changes.
  - **Audio Synthesis**: Use `AudioContext` inside `onMount` to generate a 10s buffer (sine sweep + beats) identical to the React example.
- **Pseudo-Code**:
  ```javascript
  // createHeliosSignal.js
  export function createHeliosSignal(helios) {
    const [state, setState] = createSignal(helios.getState());
    const unsubscribe = helios.subscribe(setState);
    onCleanup(unsubscribe);
    return state;
  }

  // useAudioData.js
  export function useAudioData(bufferSignal, currentTimeSignal) {
    return createMemo(() => {
      const buffer = bufferSignal();
      const time = currentTimeSignal();
      if (!buffer) return { rms: 0, waveform: [] };
      // ... slice buffer and calculate RMS/waveform ...
      return { rms, waveform };
    });
  }

  // App.jsx
  const helios = new Helios({ duration: 10, fps: 30 });
  helios.bindToDocumentTimeline(); // Critical for correct playback

  const App = () => {
    let canvasRef;
    const [buffer, setBuffer] = createSignal(null);
    const state = createHeliosSignal(helios);

    onMount(() => {
       // Generate AudioBuffer
       setBuffer(generatedBuffer);
    });

    const currentTime = () => state().currentFrame / helios.fps;
    const audioData = useAudioData(buffer, currentTime);

    createEffect(() => {
      if (!canvasRef) return;
      const ctx = canvasRef.getContext('2d');
      // Draw frame using audioData().rms and audioData().waveform
    });

    return <canvas ref={canvasRef} />;
  }
  ```
- **Public API Changes**: None.
- **Dependencies**: None (uses existing workspace dependencies).

#### 4. Test Plan
- **Verification**:
  1. `npm run build:examples`: Verify the build completes successfully and `output/example-build/examples/solid-audio-visualization/` exists.
  2. `npx vite examples/solid-audio-visualization`: Manually verify the visualization renders (pulsating circle + waveform) and syncs with time.
- **Success Criteria**:
  - The build system correctly processes the new SolidJS example (due to the updated regex).
  - Visual output matches the React/Vue/Svelte counterparts.
- **Edge Cases**:
  - Ensure `createMemo` handles the initial `null` buffer state gracefully.
