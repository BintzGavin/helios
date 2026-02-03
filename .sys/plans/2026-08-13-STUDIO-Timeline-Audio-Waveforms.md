# 2026-08-13-STUDIO-Timeline-Audio-Waveforms.md

#### 1. Context & Goal
- **Objective**: Implement client-side audio waveform visualization in the Studio Timeline.
- **Trigger**: The current timeline shows generic blocks for audio tracks. The previous plan (2026-08-10) was not executed, likely due to the complexity of transferring audio buffers from Core/Player. This new plan uses a client-side fetch strategy to decouple visualization from playback.
- **Impact**: Enables precise audio-video synchronization (e.g., cutting to beats) which is a core requirement for a video editor ("Video is Light Over Time").

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/hooks/useAudioWaveform.ts`: Hook to fetch audio `src`, decode via `OfflineAudioContext`, and return normalized peaks.
  - `packages/studio/src/components/TimelineAudioTrack.tsx`: Component to render the waveform canvas for a single track.
- **Modify**:
  - `packages/studio/src/components/Timeline.tsx`: Integrate `TimelineAudioTrack` to replace the generic `div` blocks.
  - `packages/studio/src/components/Timeline.css`: Add styles for the waveform canvas.
- **Read-Only**:
  - `packages/studio/src/context/StudioContext.tsx`: To reference `AudioTrackMetadata`.

#### 3. Implementation Spec
- **Architecture**:
  - **Hook (`useAudioWaveform`)**:
    - Input: `src` (string).
    - Output: `peaks` (number[] | null), `error` (boolean).
    - Logic:
      - Maintain a global `Map<string, number[]>` cache to prevent re-fetching/decoding on re-renders.
      - Use `fetch(src)` to get `ArrayBuffer`.
      - Use `new OfflineAudioContext(...)` to decode the buffer.
      - Downsample channel data (e.g., max absolute value per 1/100th second chunk) to a lightweight peaks array.
      - Handle CORS errors gracefully (fallback to no waveform).
  - **Component (`TimelineAudioTrack`)**:
    - Input: `track` (AudioTrackMetadata), `fps`, `pixelsPerFrame`, `height`.
    - Logic:
      - Call `useAudioWaveform(track.src)`.
      - Render a `<canvas>` sized to the track's visual width.
      - Draw the waveform (mirrored or single-sided) using the peaks data.
      - Handle resizing/zooming (re-draw canvas).
      - Respect `track.startTime` for positioning (already handled by parent, but relevant for context).
  - **Timeline Integration**:
    - Replace the mapping of `audioTracks` in `Timeline.tsx`:
      ```tsx
      {audioTracks.map((track, i) => (
        <TimelineAudioTrack
          key={track.id}
          track={track}
          fps={fps}
          pixelsPerFrame={pixelsPerFrame}
          height={TRACK_HEIGHT}
          top={getAudioTrackTop(i)}
        />
      ))}
      ```

- **Pseudo-Code**:
  - **useAudioWaveform.ts**:
    ```typescript
    const waveformCache = new Map<string, number[]>();

    export function useAudioWaveform(src: string) {
      const [peaks, setPeaks] = useState<number[] | null>(waveformCache.get(src) || null);

      useEffect(() => {
        if (!src || waveformCache.has(src)) return;

        async function load() {
          try {
            const resp = await fetch(src);
            const buff = await resp.arrayBuffer();
            const ctx = new OfflineAudioContext(1, 1, 48000);
            const audioBuffer = await ctx.decodeAudioData(buff);
            const extracted = extractPeaks(audioBuffer);
            waveformCache.set(src, extracted);
            setPeaks(extracted);
          } catch (e) { console.error(e); }
        }
        load();
      }, [src]);

      return peaks;
    }
    ```

- **Dependencies**:
  - `AudioTrackMetadata` must contain `src` (Confirmed in Core).
  - Browser must support `OfflineAudioContext` (Standard in modern browsers).

#### 4. Test Plan
- **Verification**:
  - Run `npx helios studio`.
  - Load a composition with audio (e.g., `examples/podcast-visualizer` or `examples/react-audio-visualization`).
  - Observe the audio tracks on the Timeline.
- **Success Criteria**:
  - Colored audio blocks now contain a visual waveform graph.
  - Waveform aligns with the audio content (e.g., silence shows flat line).
  - Zooming in/out scales the waveform correctly.
- **Edge Cases**:
  - Invalid `src` (should just show colored block, no crash).
  - CORS blocked audio (should show colored block).
  - Extremely short or long audio files.
