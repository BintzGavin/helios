# CORE-Decoder-Diagnostics

#### 1. Context & Goal
- **Objective**: Expand `Helios.diagnose()` to include `videoDecoders` and `audioDecoders` capabilities.
- **Trigger**: The current implementation only checks for Encoders, but the Player (for preview) and Client-Side Export (for re-encoding) also depend on decoding capabilities. The vision "Client-Side WebCodecs as Primary Export" requires robust environment checks.
- **Impact**: Enables `HeliosPlayer` and `ClientSideExporter` to verify if source assets can be decoded and played on the client, preventing runtime errors.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/core/src/index.ts`: Update `DiagnosticReport` interface and `Helios.diagnose` implementation.
  - `packages/core/src/index.test.ts`: Add tests for decoder detection.
- **Read-Only**: `packages/core/src/schema.ts`, `packages/core/src/drivers/*`.

#### 3. Implementation Spec
- **Architecture**: Extend `DiagnosticReport` to include `videoDecoders` and `audioDecoders`.
- **Public API Changes**:
  ```typescript
  export interface DiagnosticReport {
    // ... existing fields
    videoDecoders: {
      h264: boolean;
      vp8: boolean;
      vp9: boolean;
      av1: boolean;
    };
    audioDecoders: {
      aac: boolean;
      opus: boolean;
    };
  }
  ```
- **Pseudo-Code**:
  ```typescript
  // In Helios.diagnose()
  const report: DiagnosticReport = {
    // ... defaults
    videoDecoders: { h264: false, vp8: false, vp9: false, av1: false },
    audioDecoders: { aac: false, opus: false }
  };

  // Check Video Decoders
  if (typeof VideoDecoder !== 'undefined') {
    // Helper to check config support
    const checkDecoder = async (config) => {
        try {
            const support = await VideoDecoder.isConfigSupported(config);
            return support.supported ?? false;
        } catch (e) {
            return false;
        }
    };

    const [h264, vp8, vp9, av1] = await Promise.all([
       checkDecoder({ codec: 'avc1.42001E', width: 1920, height: 1080, bitrate: 2_000_000, framerate: 30 }),
       checkDecoder({ codec: 'vp8', width: 1920, height: 1080, bitrate: 2_000_000, framerate: 30 }),
       checkDecoder({ codec: 'vp09.00.10.08', width: 1920, height: 1080, bitrate: 2_000_000, framerate: 30 }),
       checkDecoder({ codec: 'av01.0.04M.08', width: 1920, height: 1080, bitrate: 2_000_000, framerate: 30 })
    ]);
    report.videoDecoders = { h264, vp8, vp9, av1 };
  }

  // Check Audio Decoders
  if (typeof AudioDecoder !== 'undefined') {
     const checkAudioDecoder = async (config) => {
        try {
            const support = await AudioDecoder.isConfigSupported(config);
            return support.supported ?? false;
        } catch (e) {
            return false;
        }
     };

     const [aac, opus] = await Promise.all([
        checkAudioDecoder({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 }),
        checkAudioDecoder({ codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 })
     ]);
     report.audioDecoders = { aac, opus };
  }
  ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `Helios.diagnose()` returns `videoDecoders` and `audioDecoders` objects in the report.
  - Tests pass when mocking `VideoDecoder` and `AudioDecoder` globals (verifying they call `isConfigSupported`).
- **Edge Cases**:
  - `VideoDecoder`/`AudioDecoder` undefined (Node.js).
  - Checks throw errors (should be caught and return false).
