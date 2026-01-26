# Context & Goal
- **Objective**: Add support for exporting compositions as WebM video files directly in the browser using `webm-muxer` and WebCodecs (VP9/Opus).
- **Trigger**: The `README.md` promises "Render to video (MP4/WebM)", but currently only MP4 is supported.
- **Impact**: Enables users to export open-standard, high-quality, royalty-free WebM videos.

# File Inventory
- **Modify**: `packages/player/package.json` (add `webm-muxer` dependency)
- **Modify**: `packages/player/src/features/exporter.ts` (implement WebM encoding logic)
- **Modify**: `packages/player/src/index.ts` (add `export-format` attribute)
- **Modify**: `packages/player/README.md` (document new attribute)

# Implementation Spec
- **Architecture**:
    - Use `webm-muxer` library (counterpart to `mp4-muxer`).
    - Extend `ClientSideExporter.export` to accept a `format` option ('mp4' | 'webm').
    - Switch `VideoEncoder` config:
        - MP4: `avc1.420028` (H.264 Baseline Level 4.0)
        - WebM: `vp09.00.10.08` (VP9 Profile 0, Level 4.1, 8-bit)
    - Switch `AudioEncoder` config:
        - MP4: `mp4a.40.2` (AAC-LC)
        - WebM: `opus`
    - Update `HeliosPlayer` to read `export-format` attribute (default: 'mp4') and pass it to the exporter.

- **Pseudo-Code**:
    ```typescript
    // packages/player/src/features/exporter.ts
    import { Muxer as Mp4Muxer } from "mp4-muxer";
    import { Muxer as WebMMuxer } from "webm-muxer";

    export class ClientSideExporter {
      async export(options: { ..., format?: 'mp4' | 'webm' }) {
        const { format = 'mp4' } = options;

        // ... setup muxer based on format ...
        // Note: webm-muxer and mp4-muxer have similar but distinct APIs
        let muxer;
        let target;

        if (format === 'webm') {
            const { ArrayBufferTarget } = await import('webm-muxer');
            target = new ArrayBufferTarget();

            muxer = new WebMMuxer({
                target,
                video: { codec: 'V_VP9', width, height, frameRate: state.fps },
                audio: { codec: 'A_OPUS', numberOfChannels: 2, sampleRate: 48000 }
            });
        } else {
            // existing MP4 setup
        }

        // ... setup encoder config ...
        const videoConfig = format === 'webm'
            ? { codec: 'vp09.00.10.08', ... }
            : { codec: 'avc1.420028', ... };

        const audioConfig = format === 'webm'
            ? { codec: 'opus', ... }
            : { codec: 'mp4a.40.2', ... };

        // ... proceed with encoding ...

        // Download filename extension
        const extension = format === 'webm' ? 'webm' : 'mp4';
      }
    }
    ```

- **Dependencies**:
    - `webm-muxer` package.

# Test Plan
- **Verification**:
    - Run `npm install` to install new dependency (executor step).
    - Run `npm run build -w packages/player` to ensure compilation.
    - Run `npm test -w packages/player` to execute tests.
    - Create a test case in `packages/player/src/features/exporter.test.ts` or `index.test.ts` that mocks `webm-muxer` and `VideoEncoder` to verify the correct config is passed when `format: 'webm'` is used.
- **Success Criteria**:
    - `ClientSideExporter` successfully initializes with `format: 'webm'`.
    - `VideoEncoder` receives VP9 config when WebM is selected.
    - `HeliosPlayer` respects `export-format="webm"`.
