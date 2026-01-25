# Plan: Implement Audio Support for Client-Side Export

#### 1. Context & Goal
- **Objective**: Enable audio support in client-side video export by capturing, mixing, and encoding audio from the composition's `<audio>` elements.
- **Trigger**: The current client-side export creates silent videos, creating a parity gap with server-side rendering and failing the "Canva-like" vision.
- **Impact**: Users can export production-ready videos (visuals + audio) directly from the browser, removing the need for server-side infrastructure for basic use cases.

#### 2. File Inventory
- **Create**:
    - `packages/player/src/features/audio-utils.ts`: Utility functions for discovering `<audio>` tags, fetching buffers, and mixing via `OfflineAudioContext`.
- **Modify**:
    - `packages/player/src/controllers.ts`: Add `getAudioTracks()` to `HeliosController` interface and implement in `DirectController`/`BridgeController`.
    - `packages/player/src/bridge.ts`: Handle `HELIOS_GET_AUDIO_TRACKS` command to scrape and transfer audio data.
    - `packages/player/src/features/exporter.ts`: Integrate `AudioEncoder` and `mp4-muxer` audio track addition.
    - `packages/player/src/features/exporter.test.ts`: Add mocks for Audio APIs and verify integration.

#### 3. Implementation Spec
- **Architecture**:
    - **Discovery**: `audio-utils.ts` runs in the iframe (or direct) context to find `<audio>` elements and fetch their `src` as `ArrayBuffer`.
    - **Bridge**: Uses `postMessage` with `transfer` list to efficiently move audio buffers to the Player context.
    - **Mixing**: `ClientSideExporter` uses `OfflineAudioContext` to mix all tracks into a single PCM buffer.
    - **Encoding**: WebCodecs `AudioEncoder` encodes the PCM buffer into AAC chunks.
    - **Muxing**: `mp4-muxer` interleaves audio chunks with video frames.

- **Pseudo-Code**:
  ```typescript
  // audio-utils.ts
  export async function getAudioAssets(doc: Document) {
    const audioTags = Array.from(doc.querySelectorAll('audio'));
    return Promise.all(audioTags.map(async (tag) => {
      const res = await fetch(tag.src);
      return { buffer: await res.arrayBuffer(), mimeType: res.headers.get('content-type') };
    }));
  }

  export async function mixAudio(assets, duration, sampleRate) {
    const ctx = new OfflineAudioContext(2, duration * sampleRate, sampleRate);
    for (const asset of assets) {
      const audioBuffer = await ctx.decodeAudioData(asset.buffer.slice(0)); // copy for safety
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start(0);
    }
    return ctx.startRendering();
  }
  ```

- **Public API Changes**:
    - `HeliosController.getAudioTracks()` added to interface.
    - New Bridge Message: `HELIOS_GET_AUDIO_TRACKS` / `HELIOS_AUDIO_DATA`.

- **Dependencies**:
    - `mp4-muxer` (existing)
    - WebCodecs API (`AudioEncoder`, `AudioData`)
    - Web Audio API (`OfflineAudioContext`)

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**:
    - Tests pass mocking `AudioEncoder` and `OfflineAudioContext`.
    - `exporter.test.ts` verifies that `muxer.addAudioChunk` is called.
- **Edge Cases**:
    - No audio elements (export proceeds with video only).
    - CORS failure on audio fetch (catch error, log, proceed with partial/no audio).
    - `AudioEncoder` configuration not supported (fallback or error).
