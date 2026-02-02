# 2026-08-04-DEMO-React-Audio-Visualization.md

## 1. Context & Goal
- **Objective**: Create `examples/react-audio-visualization` to demonstrate real-time audio frequency analysis and visualization using React and Helios.
- **Trigger**: Vision Gap - While Vanilla JS has `examples/audio-visualization`, there is no framework-specific example demonstrating how to integrate audio analysis hooks with React's render cycle, which is a common use case (music videos, podcasts).
- **Impact**: Provides a reference implementation for "Music Visualizers" in React, a key use case for programmatic video.

## 2. File Inventory
- **Create**:
  - `examples/react-audio-visualization/vite.config.js`: Vite config with React plugin and monorepo aliases.
  - `examples/react-audio-visualization/composition.html`: Entry point for Helios Player.
  - `examples/react-audio-visualization/src/main.jsx`: React mount point.
  - `examples/react-audio-visualization/src/App.jsx`: Main component, audio synthesis, and visualization loop.
  - `examples/react-audio-visualization/src/hooks/useVideoFrame.js`: Hook to subscribe to Helios frame updates.
  - `examples/react-audio-visualization/src/hooks/useAudioData.js`: Hook to extract time-domain or frequency-domain data from an AudioBuffer synchronized with Helios time.
- **Modify**:
  - `tests/e2e/verify-render.ts`: Add `react-audio-visualization` to `CANVAS_OVERRIDES` to ensure it uses the Canvas rendering strategy.
  - `examples/README.md`: Add the new example to the React section.

## 3. Implementation Spec

### A. Architecture
- **Framework**: React 18+
- **Rendering**: HTML5 Canvas (via `useRef`) for high-performance visualization, driven by `useVideoFrame`.
- **Audio Source**: In-memory synthesized `AudioBuffer` (Sine sweep + Kick drum) to ensure determinism and avoid asset dependencies, matching the pattern in `examples/audio-visualization`.
- **Synchronization**:
  - `useAudioData` hook accepts `AudioBuffer` and `currentTime`.
  - It calculates the sample window based on `currentTime * sampleRate`.
  - Returns `rms` (volume) and `waveform` (array of samples).

### B. Logic Flow
1.  **App.jsx**:
    - Generates `AudioBuffer` on mount (useEffect).
    - Instantiates `Helios`.
    - Uses `useVideoFrame(helios)` to trigger renders.
    - Calls `useAudioData(buffer, helios.currentTime)`.
    - Draws visualizer (Circle radius = RMS, Lines = Waveform) to Canvas ref.

### C. Public API Changes
- None.

## 4. Test Plan
- **Verification**:
  1.  Run `npm run build:examples` to verify compilation.
  2.  Run `npx tsx tests/e2e/verify-render.ts "React Audio Visualization"` to verify the rendering pipeline produces a valid video file.
- **Success Criteria**:
  - Build succeeds.
  - E2E test passes with `react-audio-visualization` using `mode: canvas`.
  - Output video has non-zero duration and non-black content.
- **Edge Cases**:
  - Verify that the visualization updates even if audio is silent (should draw base circle).
