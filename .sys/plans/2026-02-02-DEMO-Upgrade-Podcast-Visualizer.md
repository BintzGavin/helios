# Plan: Upgrade Podcast Visualizer to Real Waveforms

#### 1. Context & Goal
- **Objective**: Upgrade `examples/podcast-visualizer` to use real audio analysis (Web Audio API) for waveform visualization instead of a generic CSS pulse animation.
- **Trigger**: The `examples/README.md` describes this example as "Multi-track audio visualization with waveforms", but the current implementation is a fake CSS animation. This is a gap between the vision and reality.
- **Impact**: This will provide a correct, reference implementation for "Audiogram" style videos, demonstrating how to synchronize visuals with external audio assets using the Web Audio API and Helios.

#### 2. File Inventory
- **Modify**: `examples/podcast-visualizer/composition.html`
    - Replace the CSS `animation` logic with a Canvas-based visualization loop.
    - Implement audio data fetching and decoding.
    - Implement a frame-sync drawing routine that respects track offsets.

#### 3. Implementation Spec
- **Architecture**:
    - Use `AudioContext` (or `OfflineAudioContext`) to decode the audio sources referenced in the `<audio>` tags.
    - Store the decoded `AudioBuffer` for each track.
    - Replace the `.visualizer` DIVs with `<canvas>` elements.
    - Inside `helios.subscribe()`:
        - Iterate through each track.
        - Calculate the local track time: `(currentFrame / fps) - offset`.
        - If time is within the audio duration:
            - Extract a window of PCM data (e.g., 512 samples) around the current playback position.
            - Calculate the RMS amplitude for "Bar" style visualization.
            - Draw the amplitude to the canvas.
- **Pseudo-Code**:
    ```javascript
    // Pre-load and decode audio
    async function loadAudio(src) {
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();
        return ctx.decodeAudioData(arrayBuffer);
    }

    // In render loop
    helios.subscribe(({ currentFrame, fps }) => {
        const time = currentFrame / fps;

        tracks.forEach(track => {
            const trackTime = time - track.offset;
            const buffer = track.buffer;

            if (trackTime >= 0 && trackTime < buffer.duration) {
                 // Get RMS of current window
                 const pcm = buffer.getChannelData(0);
                 const index = Math.floor(trackTime * buffer.sampleRate);
                 // Calculate RMS...
                 // Draw to canvas...
            } else {
                 // Draw silence (flat line/empty bar)
            }
        });
    });
    ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run build:examples && npm run verify:e2e`
- **Success Criteria**:
    - The `podcast-visualizer` example builds and passes E2E verification.
    - The output video shows dynamic visualization that matches the audio events (silence where appropriate, movement where sound exists).
    - Specifically, the "Voice" track should show no activity until the 2-second mark (due to `data-helios-offset="2"`).
- **Edge Cases**:
    - Network failure on fetching audio (use embedded data URI as fallback/default).
    - Audio decoding failure.
