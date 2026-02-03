# 2026-08-10-STUDIO-Timeline-Audio-Waveforms.md

#### 1. Context & Goal
- **Objective**: Implement visual audio waveforms on the Timeline to enable precise audio-video synchronization and editing.
- **Trigger**: Vision gap ("Visual Timeline" implies waveforms) and resolution of previous technical blockers (access to audio buffers).
- **Impact**: Significantly improves the editing experience by allowing users to see audio cues (beats, silence) relative to video frames.

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/types.ts`: Central definition for shared types like `AudioAsset`.
  - `packages/studio/src/components/AudioWaveform.tsx`: New component to decode and render audio waveforms.
- **Modify**:
  - `packages/studio/src/components/Timeline.tsx`: Fetch audio assets and integrate `AudioWaveform` into track blocks.
  - `packages/studio/src/components/AudioMixerPanel/AudioMixerPanel.tsx`: Refactor to use shared `AudioAsset` type.
  - `packages/studio/src/setupTests.ts`: Add mocks for `AudioContext` and `OfflineAudioContext`.
- **Read-Only**:
  - `packages/studio/src/context/StudioContext.tsx`

#### 3. Implementation Spec
- **Architecture**:
  - **Shared Types**: Extract `AudioAsset` interface (currently in `AudioMixerPanel`) to `types.ts` to share between Mixer and Timeline.
  - **Data Access**: `Timeline.tsx` will fetch full audio assets (including `ArrayBuffer`) using `controller.getAudioTracks()` when the controller is available. These will be stored in local state (`audioBuffers` map).
  - **Waveform Rendering**: `AudioWaveform.tsx` will receive the `buffer` (ArrayBuffer).
    - It will use `window.OfflineAudioContext` to asynchronously decode the `ArrayBuffer` into an `AudioBuffer`.
    - It will use a `Canvas` element to draw the waveform.
    - It will implement simple peak sampling (min/max per pixel column) to draw the wave.
    - It will handle prop updates (width/height) to redraw.
  - **Timeline Integration**: The `Timeline` will pass the relevant buffer to `AudioWaveform` inside the track's visual block.
- **Pseudo-Code**:
  - **AudioWaveform.tsx**:
    ```tsx
    const AudioWaveform = ({ buffer, width, height, color }) => {
      const [decoded, setDecoded] = useState(null);
      useEffect(() => {
        // decodeAudioData(buffer.slice(0)) -> setDecoded
      }, [buffer]);

      useEffect(() => {
        if (!decoded) return;
        // const ctx = canvas.getContext('2d');
        // Loop width pixels:
        //   Calculate time range for pixel
        //   Find max amplitude in that range
        //   Draw line
      }, [decoded, width, height]);

      return <canvas width={width} height={height} />;
    }
    ```
  - **Timeline.tsx**:
    ```tsx
    const [audioAssets, setAudioAssets] = useState({});
    useEffect(() => {
      if (controller) controller.getAudioTracks().then(assets => setAudioAssets(mapById(assets)));
    }, [controller]);

    // In render loop:
    <div className="track">
       <AudioWaveform buffer={audioAssets[track.id]?.buffer} ... />
    </div>
    ```
- **Public API Changes**: None (Internal UI only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm test` to verify `AudioWaveform` mounts (mocking AudioContext).
  - Run `npx helios studio` and load an example with audio (e.g., `podcast-visualizer` or `react-audio-visualization`).
  - Verify that audio tracks on the timeline show a waveform visualization matching the audio content.
- **Success Criteria**:
  - Waveforms are visible and responsive to zoom (width changes).
  - Tests pass with mocked Web Audio API.
- **Edge Cases**:
  - Audio tracks with no buffer (loading or failed).
  - Very short audio clips.
  - Zoom levels causing extreme width variations.
