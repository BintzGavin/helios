# 2026-02-18-STUDIO-Audio-Visualization

## 1. Context & Goal
- **Objective**: Replace the static "block" visualization of audio tracks in the Studio Timeline with accurate audio waveforms.
- **Trigger**: The "Visual Timeline" vision requires rich visual feedback, but currently audio is represented only by generic metadata blocks (v0.81.0), obscuring content details like beats or silence.
- **Impact**: Enables precise visual editing by allowing users to align animation with audio cues (peaks, speech patterns) directly in the timeline.

## 2. File Inventory
- **Create**:
  - `packages/studio/src/utils/audio.ts`: Utilities for fetching, decoding, and extracting audio peaks.
  - `packages/studio/src/utils/audio.test.ts`: Unit tests for peak extraction logic.
  - `packages/studio/src/types.ts`: Centralized type definitions (including `AudioAsset` duplication).
- **Modify**:
  - `packages/studio/src/context/StudioContext.tsx`: Add state/logic to fetch audio tracks via `controller.getAudioTracks()` and store waveform data.
  - `packages/studio/src/components/Timeline.tsx`: Render `<canvas>` elements for audio tracks and draw waveforms.
  - `packages/studio/src/components/Timeline.css`: Styling for waveform containers.
- **Read-Only**:
  - `packages/player/src/features/audio-utils.ts`: Reference for `AudioAsset` shape (cannot import directly).

## 3. Implementation Spec
- **Architecture**:
  - **Data Fetching**: `StudioContext` calls `controller.getAudioTracks()` (which returns `Promise<AudioAsset[]>`) when `availableAudioTracks` changes.
  - **Processing**: `src/utils/audio.ts` uses `AudioContext.decodeAudioData` to convert `ArrayBuffer` to `AudioBuffer`, then extracts "peaks" (min/max pairs per N samples) to a `Float32Array`.
  - **State**: `audioWaveforms` map (`trackId` -> `peaks[]`) stored in `StudioContext`.
  - **Rendering**: `Timeline` component uses a `<canvas>` per track. It draws the peaks efficiently.
- **Pseudo-Code**:
  ```typescript
  // utils/audio.ts
  export async function extractPeaks(buffer: ArrayBuffer, samplesPerPixel: number): Promise<Float32Array> {
    const ctx = new AudioContext(); // or OfflineAudioContext
    const audioBuffer = await ctx.decodeAudioData(buffer);
    // ... loop through channel data, find min/max for each bucket ...
    return peaks;
  }

  // StudioContext.tsx
  useEffect(() => {
    if (controller) {
       controller.getAudioTracks().then(assets => {
          assets.forEach(async asset => {
             const peaks = await extractPeaks(asset.buffer);
             setWaveforms(prev => new Map(prev).set(asset.id, peaks));
          });
       });
    }
  }, [playerState.availableAudioTracks]);
  ```
- **Dependencies**:
  - Requires `HeliosController` to implement `getAudioTracks` (confirmed in v0.69.0/codebase).
  - Requires browser `AudioContext` support (standard).

## 4. Test Plan
- **Verification**:
  1. Start Studio: `npx helios studio`
  2. Load `examples/podcast-visualizer` (or any composition with audio).
  3. Observe Timeline: Audio tracks should show visual waveforms instead of solid blocks.
  4. Interactions: Zooming the timeline should update the waveform resolution/scale.
- **Success Criteria**:
  - Waveforms accurately reflect the audio content (silence = flat line, loud = high peaks).
  - No significant performance degradation during scrolling/playback.
- **Edge Cases**:
  - Audio file fails to decode (should handle error gracefully, keep block).
  - Zero duration audio.
  - Very long audio files (performance check).
