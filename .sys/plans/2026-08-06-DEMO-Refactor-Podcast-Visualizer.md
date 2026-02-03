# Plan: Refactor Podcast Visualizer to Real Audio Analysis

## 1. Context & Goal
- **Objective**: Refactor `examples/podcast-visualizer` to use real `AudioContext` analysis for visualization, replacing simulated CSS animations.
- **Trigger**: Discrepancy between documentation ("visualization with waveforms") and implementation (simulated CSS animations) identified during code audit.
- **Impact**: Demonstrates advanced audio analysis in Vanilla JS, improves example quality, removes deceptive implementation, and proves the "Any Framework" promise for complex multimedia.

## 2. File Inventory
- **Modify**: `examples/podcast-visualizer/composition.html` (Replace fake visualization logic with real AudioContext analysis)
- **Read-Only**: `examples/react-audio-visualization/src/hooks/useAudioData.js` (Reference for analysis logic)

## 3. Implementation Spec
- **Architecture**: Vanilla JS using `AudioContext` for analysis and DOM manipulation for rendering.
- **Pseudo-Code**:
  - Initialize `AudioContext` and `Helios`.
  - Fetch the Base64 audio source (shared by tracks) as an `ArrayBuffer`.
  - Decode it into an `AudioBuffer`.
  - In `helios.subscribe(({ currentFrame, fps })`:
    - Calculate `currentTime = currentFrame / fps`.
    - For "Music Track" (Offset 0):
      - Sample `AudioBuffer` at `currentTime`.
      - Calculate RMS (Volume) for a small window.
      - Update `.music-bar` width/opacity based on RMS.
    - For "Voice Track" (Offset 2):
      - Calculate `voiceTime = currentTime - 2`.
      - If `voiceTime < 0`, volume is 0.
      - Else, sample `AudioBuffer` at `voiceTime`.
      - Update `#voice-visual` opacity based on RMS.
  - **Note**: The `<audio>` elements remain to handle the *audio output* during preview/render (via DomDriver), while the `AudioContext` is used purely for *visualization analysis* to ensure frame-perfect rendering support (random access).

- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1. Run `npm run build:examples` to ensure the example builds.
  2. Run `npx tsx tests/e2e/verify-render.ts podcast-visualizer` to verify the render pipeline still works and produces a video.
- **Success Criteria**:
  - Build succeeds.
  - `verify-render.ts` passes for `podcast-visualizer`.
- **Edge Cases**:
  - Handle audio decoding errors.
  - Handle `currentTime` out of bounds (looping logic if needed, though simple clamping is fine for this example).
