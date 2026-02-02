#### 1. Context & Goal
- **Objective**: Implement audio waveform visualization on the Studio Timeline to replace generic track blocks.
- **Trigger**: Vision gap "Visual timeline" vs Reality (colored blocks). Status file mentions "Timeline Audio Visualization" as completed but implementation is missing waveforms.
- **Impact**: Enables precise audio editing (cutting to beat, syncing visuals to sound) and improves the "Studio" experience.

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/utils/audio.ts`: Helper for decoding audio buffers and extracting peak data.
  - `packages/studio/src/hooks/useAudioWaveforms.ts`: React hook to manage fetching `AudioBuffer` from Player, computing peaks, and caching results.
  - `packages/studio/src/components/WaveformTrack.tsx`: Component to render waveform data to a canvas.
- **Modify**:
  - `packages/studio/src/components/Timeline.tsx`: Integrate `useAudioWaveforms` and render `WaveformTrack` within audio track elements.
  - `packages/studio/src/components/Timeline.css`: Styling updates for the waveform container.
- **Read-Only**:
  - `packages/player/src/features/audio-utils.ts`: Reference for `AudioAsset` structure.
  - `packages/core/src/drivers/TimeDriver.ts`: Reference for `AudioTrackMetadata`.

#### 3. Implementation Spec
- **Architecture**:
  - **Data Flow**: `Timeline` gets metadata -> `useAudioWaveforms` detects new tracks -> calls `controller.getAudioTracks()` -> decodes & computes peaks -> `Timeline` receives peaks -> passes to `WaveformTrack` -> renders Canvas.
  - **Performance**:
    - Use `OfflineAudioContext` for decoding to avoid main thread blocking if possible (though decoding is async).
    - Compute "peaks" (min/max pairs) at a fixed resolution (e.g., 100 samples per second) to keep memory low.
    - Cache peaks by `track.src` or `track.id` to avoid re-decoding on every render.
    - Render to `<canvas>` to avoid thousands of DOM elements.

- **Pseudo-Code**:
  ```typescript
  // packages/studio/src/utils/audio.ts
  export async function decodeAudio(buffer: ArrayBuffer): Promise<AudioBuffer> {
    const ctx = new OfflineAudioContext(1, 1, 44100);
    return ctx.decodeAudioData(buffer.slice(0)); // slice to copy if needed
  }

  export function computePeaks(audioBuffer: AudioBuffer, samplesPerSecond: number): Float32Array {
    // 1. Calculate step size based on sampleRate / samplesPerSecond
    // 2. Iterate channel data (mono mix or just channel 0)
    // 3. Find max amplitude in each step window
    // 4. Return Float32Array of peaks (0..1)
  }

  // packages/studio/src/hooks/useAudioWaveforms.ts
  export function useAudioWaveforms(tracks: AudioTrackMetadata[], controller: HeliosController) {
    const [waveforms, setWaveforms] = useState<Map<string, Float32Array>>(new Map());

    useEffect(() => {
      // 1. Identify missing tracks
      // 2. If missing, call controller.getAudioTracks()
      // 3. Match metadata to assets
      // 4. decodeAudio() -> computePeaks()
      // 5. Update state
    }, [tracks]);

    return waveforms;
  }

  // packages/studio/src/components/WaveformTrack.tsx
  export const WaveformTrack = ({ peaks, color, width, height }) => {
    // Canvas ref
    // draw loop:
    //  ctx.clearRect
    //  ctx.beginPath
    //  loop peaks:
    //    x = (i / totalPeaks) * width
    //    y = height * (1 - peak) / 2 ... centered
    //    ctx.lineTo(x, y)
    //  ctx.stroke
  }
  ```

- **Public API Changes**: None. Internal Studio components only.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npx helios studio`.
  - Open a composition with audio (e.g., `examples/podcast-visualizer` or create one).
  - Observe the Timeline.
- **Success Criteria**:
  - Audio tracks display a visual waveform (peaks) instead of just a flat color.
  - Waveforms scale correctly when zooming in/out.
  - No significant performance degradation during playback or scrolling.
- **Edge Cases**:
  - Multiple audio tracks.
  - Very long audio tracks (memory usage).
  - Silent audio tracks (flat line).
  - Audio loading failures (should handle gracefully, maybe show error state or empty).
