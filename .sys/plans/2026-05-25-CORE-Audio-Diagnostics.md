#### 1. Context & Goal
- **Objective**: Expand `Helios.diagnose()` to include audio codec support (AAC, Opus).
- **Trigger**: Vision gap "AI Integration Parity" -> "robust environment diagnostics", specifically missing audio codec checks which are critical for client-side export.
- **Impact**: Enables `ClientSideExporter` and AI agents to determine supported audio export formats, ensuring robust export workflows.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/core/src/index.ts`: Update `DiagnosticReport` interface and `Helios.diagnose` implementation.
  - `packages/core/src/index.test.ts`: Add test cases for audio codec detection.
- **Read-Only**: None

#### 3. Implementation Spec
- **Architecture**: Extend the existing `DiagnosticReport` interface and `Helios.diagnose` static method. Follow the pattern established for `videoCodecs` using `AudioEncoder.isConfigSupported`.
- **Pseudo-Code**:
  ```typescript
  // In DiagnosticReport interface
  audioCodecs: {
    aac: boolean;
    opus: boolean;
  }

  // In Helios.diagnose()
  const report = {
    // ... existing fields
    audioCodecs: { aac: false, opus: false }
  };

  if (typeof AudioEncoder !== 'undefined') {
    const checkAudio = async (config: any) => {
        try {
            const support = await AudioEncoder.isConfigSupported(config);
            return support.supported ?? false;
        } catch (e) { return false; }
    };

    const [aac, opus] = await Promise.all([
        checkAudio({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 }),
        checkAudio({ codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 })
    ]);
    report.audioCodecs = { aac, opus };
  }
  ```
- **Public API Changes**: `DiagnosticReport` interface now includes `audioCodecs`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `Helios.diagnose()` returns an object containing `audioCodecs: { aac: boolean, opus: boolean }`.
  - Tests pass mocking `AudioEncoder` (if supported by environment) or verifying graceful fallback.
- **Edge Cases**:
  - `AudioEncoder` is undefined (Node.js environment).
  - `AudioEncoder` throws during check.
