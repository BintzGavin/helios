# 2026-06-29-DEMO-React-Podcast-Visualizer.md

## 1. Context & Goal
- **Objective**: Create `examples/react-podcast-visualizer` to demonstrate audio offset synchronization in React, bridging a framework parity gap.
- **Trigger**: Vision Gap - "Use What You Know" implies framework parity; currently, audio offsets (`data-helios-offset`) are only demonstrated in the Vanilla `podcast-visualizer` example.
- **Impact**: Enables React developers to build audio-driven videos (podcasts, music visualizers) using standard Helios patterns and provides a reference implementation for React-based audio synchronization.

## 2. File Inventory
- **Create**:
  - `examples/react-podcast-visualizer/composition.html`: The entry point for the example.
  - `examples/react-podcast-visualizer/src/main.jsx`: React root and mounting logic.
  - `examples/react-podcast-visualizer/src/App.jsx`: Main application component containing the layout and audio elements.
  - `examples/react-podcast-visualizer/src/hooks/useVideoFrame.js`: Custom hook to subscribe to Helios frame updates.
  - `examples/react-podcast-visualizer/src/components/HeliosProvider.jsx`: Context provider for the Helios instance.
- **Read-Only**:
  - `examples/podcast-visualizer/composition.html` (Reference for audio assets and logic)
  - `examples/react-captions-animation/src/App.jsx` (Reference for React structure)

## 3. Implementation Spec

### A. Architecture
- **Framework**: React 18+ (using `react-dom/client`).
- **State Management**: React Context (`HeliosContext`) to prop-drill the `helios` instance and frame state.
- **Sync Strategy**:
  - `HeliosProvider` initializes `Helios` and calls `helios.bindToDocumentTimeline()` for Renderer compatibility.
  - `useVideoFrame` hook consumes the context to trigger re-renders on frame updates (or selectively via refs for performance, though re-renders are acceptable for this scale).

### B. Logic Flow
1.  **HeliosProvider**:
    - Instantiates `new Helios({ duration: 5, fps: 30, autoSyncAnimations: true })`.
    - Subscribes to `helios.subscribe()` to update a generic `frameState` object in the Context.
    - Exposes `{ helios, frame, fps, duration }`.
2.  **App Component**:
    - Defines the Base64 audio source (copied from `podcast-visualizer`).
    - Renders layout similar to the Vanilla example (Tracks: Music, Voice, Muted).
    - **Audio Elements**:
      - `<audio src={AUDIO_SRC} data-helios-offset="0" loop />` (Music)
      - `<audio src={AUDIO_SRC} data-helios-offset="2" />` (Voice - starts at 2s)
      - `<audio src={AUDIO_SRC} muted loop />` (Muted)
    - **Visuals**:
      - Music Bar: Uses CSS animation (`pulse`) - demonstrating "standard CSS just works".
      - Voice Indicator: Uses `useVideoFrame` to calculate opacity: `opacity: (frame / fps) >= 2 ? 1 : 0`.

### C. Public API Changes
- None. This is an example only.

## 4. Test Plan
- **Verification**:
  1.  Run `npm run build:examples` to ensure the new example compiles correctly with Vite.
  2.  Run `npx tsx tests/e2e/verify-render.ts` to verify the rendering pipeline processes the new example and produces a video file.
- **Success Criteria**:
  - Build completes without error.
  - `tests/e2e/verify-render.ts` successfully renders `examples/react-podcast-visualizer/composition` to an MP4 file.
  - The render logs confirm successful capture.
- **Edge Cases**:
  - Verify that `data-helios-offset` is preserved in the DOM output (React sometimes strips unknown attributes, but data attributes are safe).
