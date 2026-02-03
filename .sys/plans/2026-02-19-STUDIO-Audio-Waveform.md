#### 1. Context & Goal
- **Objective**: Implement audio waveform visualization in the Studio Timeline to replace generic track blocks.
- **Trigger**: Vision gap "Visual timeline" vs Reality (colored blocks). Status file mentions "Timeline Audio Visualization" as completed but implementation is missing waveforms.
- **Impact**: Enables precise audio editing (cutting to beat, syncing visuals to sound) and improves the "Studio" experience.

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/utils/audio.ts`: Helper for decoding audio buffers and extracting peak data.
  - `packages/studio/src/components/Timeline/AudioWaveform.tsx`: Component to render waveform data to a canvas.
  - `packages/studio/src/components/Timeline/index.ts`: Export for the refactored Timeline component.
- **Move & Modify**:
  - `packages/studio/src/components/Timeline.tsx` -> `packages/studio/src/components/Timeline/Timeline.tsx`: Refactor to use `AudioWaveform` and fetch audio buffers.
  - `packages/studio/src/components/Timeline.css` -> `packages/studio/src/components/Timeline/Timeline.css`: Update styles if necessary.
- **Modify**:
  - `packages/studio/src/setupTests.ts`: Add `AudioContext` and `OfflineAudioContext` mocks for testing.
- **Read-Only**:
  - `packages/player/src/features/audio-utils.ts`: Reference for `AudioAsset` structure.

#### 3. Implementation Spec
- **Architecture**:
  - **Data Flow**: `Timeline` gets metadata (from `playerState`) and fetches buffers (from `controller.getAudioTracks()`).
  - `Timeline` maps track IDs to buffers and passes them to `AudioWaveform`.
  - `AudioWaveform` handles decoding (`AudioContext.decodeAudioData`) and peak computation (`computePeaks`).
  - **Optimization**:
    - Decode once per asset and cache results (in component state or context).
    - Render to `<canvas>` using `requestAnimationFrame` or `useEffect`.
    - Use `ResizeObserver` to redraw on width change.

- **Pseudo-Code**:
  ```typescript
  // packages/studio/src/utils/audio.ts
  export async function decodeAudio(buffer: ArrayBuffer): Promise<AudioBuffer> {
    // Reuse context if possible, or create temp one
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // decodeAudioData consumes the buffer, so we might need to slice it if used elsewhere
    return ctx.decodeAudioData(buffer.slice(0));
  }

  export function computePeaks(audioBuffer: AudioBuffer, width: number): Float32Array {
    // Compute peaks for the specific width (pixels)
    // Return interleaved min/max or just max
  }

  // packages/studio/src/components/Timeline/AudioWaveform.tsx
  export const AudioWaveform = ({ buffer, width, height, color }) => {
    const [decoded, setDecoded] = useState<AudioBuffer | null>(null);

    useEffect(() => {
        if (buffer) decodeAudio(buffer).then(setDecoded);
    }, [buffer]);

    useEffect(() => {
        if (!decoded || !canvasRef.current) return;
        // drawPeaks(decoded, canvasRef.current, width, height, color);
    }, [decoded, width, height, color]);

    return <canvas ref={canvasRef} width={width} height={height} />;
  }

  // packages/studio/src/components/Timeline/Timeline.tsx
  // ...
  const [audioBuffers, setAudioBuffers] = useState<Record<string, ArrayBuffer>>({});

  useEffect(() => {
      if (controller) {
          controller.getAudioTracks().then(tracks => {
              // Map to ID -> Buffer
          });
      }
  }, [controller, playerState.availableAudioTracks]);
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
  - No significant performance degradation.
- **Edge Cases**:
  - Audio track with no buffer.
  - Decoding errors.
  - Resizing window.
