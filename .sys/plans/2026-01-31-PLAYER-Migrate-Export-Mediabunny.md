# 1. Context & Goal
- **Objective**: Migrate the client-side video export functionality in `@helios-project/player` from deprecated libraries (`mp4-muxer`, `webm-muxer`) to the modern, unified `mediabunny` library.
- **Trigger**: NPM warnings indicate `mp4-muxer` and `webm-muxer` are deprecated and superseded by `mediabunny`.
- **Impact**: Ensures long-term maintainability, removes deprecation warnings, and simplifies the export logic by using a single library that abstracts WebCodecs configuration for both MP4 and WebM.

# 2. File Inventory
- **Modify**: `packages/player/package.json` (Remove `mp4-muxer`, `webm-muxer`; add `mediabunny`)
- **Modify**: `packages/player/src/features/exporter.ts` (Refactor `ClientSideExporter` to use `mediabunny` classes like `Output`, `VideoSampleSource`, `AudioSampleSource`)
- **Modify**: `packages/player/src/features/exporter.test.ts` (Update unit tests to mock `mediabunny` exports instead of `mp4-muxer`/`webm-muxer`)

# 3. Implementation Spec
- **Architecture**:
    - Remove `VideoEncoder`/`AudioEncoder` direct instantiation in `exporter.ts`.
    - Use `mediabunny`'s `Output`, `BufferTarget`, `Mp4OutputFormat`/`WebMOutputFormat`.
    - Use `mediabunny`'s `VideoSampleSource` and `AudioSampleSource` to handle encoding and muxing.
    - `VideoSampleSource` will receive `VideoSample` objects created from the `VideoFrame`s returned by `controller.captureFrame`.
    - `AudioSampleSource` will receive `AudioSample` objects created from the mixed `AudioBuffer`.
    - The `export` loop will simply add samples to the sources, and `mediabunny` will handle the WebCodecs piping internally.
- **Pseudo-Code**:
    ```typescript
    import { Output, BufferTarget, Mp4OutputFormat, WebMOutputFormat, VideoSampleSource, AudioSampleSource, VideoSample, AudioSample, VideoEncodingConfig, AudioEncodingConfig } from 'mediabunny';

    // ... inside export() ...

    // 1. Setup Output
    const target = new BufferTarget();
    const formatObj = format === 'webm' ? new WebMOutputFormat() : new Mp4OutputFormat();
    const output = new Output({ format: formatObj, target });

    // 2. Setup Video Track
    const videoConfig: VideoEncodingConfig = {
        codec: format === 'webm' ? 'vp9' : 'avc',
        bitrate: 5_000_000,
        // ... other config
    };
    const videoSource = new VideoSampleSource(videoConfig);
    output.addVideoTrack(videoSource);

    // 3. Setup Audio Track (if needed)
    let audioSource;
    if (hasAudio) {
        const audioConfig: AudioEncodingConfig = { ... };
        audioSource = new AudioSampleSource(audioConfig);
        output.addAudioTrack(audioSource);
    }

    await output.start();

    // 4. Loop
    for (frame of frames) {
        // ... capture frame ...
        const sample = new VideoSample(videoFrame);
        await videoSource.add(sample);
        // ... progress ...
    }

    // 5. Audio
    if (audioSource) {
        // ... mix audio ...
        const sample = new AudioSample({ ... });
        await audioSource.add(sample);
    }

    await output.finalize();
    // Download target.buffer
    ```
- **Public API Changes**: None (internal implementation detail of `ClientSideExporter`).
- **Dependencies**: None.

# 4. Test Plan
- **Verification**:
    - Run `npm test -w packages/player` to verify `exporter.test.ts` passes with new mocks.
- **Success Criteria**:
    - `npm test` passes.
    - `exporter.ts` no longer imports `mp4-muxer` or `webm-muxer`.
    - Code compiles without type errors.
- **Edge Cases**:
    - Ensure `abortSignal` still stops the process.
    - Handle fallback/defaults if `mediabunny` requires stricter types.
