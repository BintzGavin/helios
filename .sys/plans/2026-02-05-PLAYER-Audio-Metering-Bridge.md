# Plan: Implement Audio Metering Bridge

## 1. Context & Goal
- **Objective**: Implement a real-time audio metering system that exposes audio levels (RMS) from the `HeliosPlayer` iframe to the parent context.
- **Trigger**: The Studio domain is currently blocked from implementing audio meters because `BridgeController` does not expose audio stream data, as noted in the Journal.
- **Impact**: Unlocks "Real-time Audio Metering" feature in Helios Studio. Enables hosting applications to visualize audio activity, improving the user experience for audio-heavy compositions.

## 2. File Inventory
- **Create**: `packages/player/src/features/audio-metering.ts`
  - Purpose: Implements `AudioMeter` class to scan `<audio>` tags, manage `AudioContext`/`AnalyserNode`, and calculate stereo RMS levels.
- **Modify**: `packages/player/src/bridge.ts`
  - Change: Add handlers for `HELIOS_START_METERING`, `HELIOS_STOP_METERING`. Implement polling loop to read from `AudioMeter` and broadcast `HELIOS_AUDIO_LEVELS`.
- **Modify**: `packages/player/src/controllers.ts`
  - Change: Update `HeliosController` interface. Implement methods in `DirectController` (direct access) and `BridgeController` (postMessage relay).
- **Modify**: `packages/player/src/index.ts`
  - Change: Add `audiometering` event listener logic to `HeliosPlayer` to expose data to the host.

## 3. Implementation Spec

### Architecture
The solution uses the Web Audio API (`AudioContext`, `MediaElementAudioSourceNode`, `AnalyserNode`) inside the iframe (or main window for Direct mode) to analyze the audio output of `HTMLAudioElement`s discovered in the composition.

**Challenges & Mitigations:**
- **CORS**: `MediaElementAudioSourceNode` outputs silence for cross-origin resources without CORS headers. *Mitigation*: We accept this limitation; the meter will just show zero.
- **Dynamic Content**: Audio tracks may be added/removed. *Mitigation*: The `AudioMeter` will re-scan or allow manual refresh (initially on start).
- **Performance**: Broadcasting high-frequency data via `postMessage`. *Mitigation*: The bridge will throttle updates to ~60fps and only send lightweight RMS/Peak data (not full FFT buffers).

### Pseudo-Code

#### `features/audio-metering.ts`
```typescript
export interface AudioLevels {
  left: number; // 0.0 - 1.0 (RMS)
  right: number; // 0.0 - 1.0 (RMS)
  peakLeft: number;
  peakRight: number;
}

export class AudioMeter {
  private ctx: AudioContext;
  private analyser: AnalyserNode;
  private sources: MediaElementAudioSourceNode[] = [];

  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.connect(this.ctx.destination); // Ensure audio still plays
  }

  connect(doc: Document) {
    // 1. Find all <audio> elements
    // 2. For each, createMediaElementSource (if not already created)
    // 3. Connect source -> analyser
  }

  getLevels(): AudioLevels {
    // 1. getByteTimeDomainData or getFloatTimeDomainData
    // 2. Calculate RMS for channels
    // 3. Return levels
  }

  dispose() {
    // Close context, disconnect nodes
  }
}
```

#### `bridge.ts`
- Listen for `HELIOS_START_METERING`:
  - Instantiate `AudioMeter`.
  - Start `requestAnimationFrame` loop.
  - In loop: Call `meter.getLevels()`, post `HELIOS_AUDIO_LEVELS`.
- Listen for `HELIOS_STOP_METERING`:
  - Stop loop, dispose `AudioMeter`.

#### `controllers.ts`
- Interface `HeliosController`:
  - `startAudioMetering(): void`
  - `stopAudioMetering(): void`
  - `onAudioMetering(callback: (levels: AudioLevels) => void): () => void`

#### `index.ts`
- Add `audiometering` CustomEvent.
- When controller emits `onAudioMetering`, dispatch `new CustomEvent('audiometering', { detail: levels })`.

### Public API Changes
- **`HeliosController` Interface**: Added metering methods.
- **`<helios-player>` Events**: Added `audiometering` event.

### Dependencies
- None.

## 4. Test Plan
- **Verification**: Run `npm run build -w packages/player` to ensure types are correct.
- **Manual Verification**: Since this is a visual feature, I will create a test case in `examples/` (or use existing) that enables metering and logs the events to console.
- **Success Criteria**:
  - Calling `player.startAudioMetering()` starts the flow.
  - `audiometering` events are fired.
  - Data contains `left`/`right` values.
