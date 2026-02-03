# STUDIO: Implement Audio Waveforms

#### 1. Context & Goal
- **Objective**: Implement visual audio waveforms on the Studio Timeline tracks to enable precise audio-video synchronization.
- **Trigger**: Vision Gap - The current "Timeline Audio Visualization" only renders generic blocks, missing the "WYSIWYG" requirement for timing edits against audio peaks (beats/dialogue).
- **Impact**: Unlocks professional-grade editing workflows (syncing animation to music) and improves the "Agent Experience" by making audio structure visible.

#### 2. File Inventory
- **Create**: `packages/studio/src/components/AudioWaveform.tsx` (New component to render ArrayBuffer to Canvas)
- **Modify**: `packages/studio/src/types.ts` (Add `AudioAsset` interface)
- **Modify**: `packages/studio/src/context/StudioContext.tsx` (Add `audioAssets` state and `refreshAudioTracks` method)
- **Modify**: `packages/studio/src/components/AudioMixerPanel/AudioMixerPanel.tsx` (Refactor to use shared `audioAssets` from context)
- **Modify**: `packages/studio/src/components/Timeline.tsx` (Render `AudioWaveform` component inside audio tracks)

#### 3. Implementation Spec
- **Architecture**:
  - Lift audio data fetching from `AudioMixerPanel` to `StudioContext` to share `ArrayBuffer` data between Mixer and Timeline.
  - Use `OfflineAudioContext` (browser native) in `AudioWaveform` to decode `ArrayBuffer` into `AudioBuffer`.
  - Use HTML5 `<canvas>` to render the waveform peaks (optimized, one-time render) instead of heavy DOM nodes.

- **Pseudo-Code**:
  - **types.ts**: Export `AudioAsset` (id, buffer, volume, etc).
  - **StudioContext.tsx**:
    - Add `audioAssets: AudioAsset[]` state.
    - `refreshAudioTracks()`: Call `controller.getAudioTracks()`, update state.
    - Call refresh when controller connects.
  - **AudioWaveform.tsx**:
    - Props: `buffer`, `color`.
    - Effect: `new OfflineAudioContext(...)`, `decodeAudioData(buffer)`, calculate peaks, draw to canvas.
    - Memoize peaks to avoid re-decoding.
  - **Timeline.tsx**:
    - Iterate `playerState.availableAudioTracks` (metadata for position).
    - Find matching `audioAssets` (content for waveform) by ID.
    - Render `<AudioWaveform buffer={asset.buffer} />` inside the track div.

- **Public API Changes**:
  - `StudioContext` exposes `audioAssets` and `refreshAudioTracks`.

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  1. Run `npx helios studio` in `examples/podcast-visualizer` (or any example with audio).
  2. Open the Timeline panel.
- **Success Criteria**:
  - Audio tracks on the timeline display a visual waveform (peaks/valleys) inside the track bar.
  - Waveform aligns visually with the audio content (if verifiable, e.g., silence = flat line).
  - `AudioMixerPanel` continues to function (volume/mute) using the shared context data.
- **Edge Cases**:
  - Audio with `0` duration.
  - Failed decoding (corrupt buffer).
  - Large audio files (performance check - ensure UI doesn't freeze during decoding).
