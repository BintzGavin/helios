# Core Context

## A: Architecture
The Core domain implements the "Helios State Machine" pattern.
- **Store**: `Helios` class maintains reactive state (signals) for frame, time, and playback properties.
- **Actions**: Public methods (e.g., `seek`, `play`, `setDuration`) update the state.
- **Subscribers**: External consumers (Renderer, Player, DOM) subscribe to state changes via `helios.subscribe()`.
- **Drivers**: `TimeDriver` implementations (e.g., `DomDriver`) synchronize external systems (DOM elements, WAAPI) with the internal state.

## B: File Tree
packages/core/src/
├── Helios.ts
├── ai.ts
├── animation.ts
├── captions.ts
├── color.ts
├── drivers/
│   ├── DomDriver.ts
│   ├── ManualTicker.ts
│   ├── NoopDriver.ts
│   ├── RafTicker.ts
│   ├── Ticker.ts
│   ├── TimeDriver.ts
│   ├── TimeoutTicker.ts
│   └── index.ts
├── easing.ts
├── errors.ts
├── gsap-sync.test.ts
├── index.ts
├── markers.ts
├── random.ts
├── render-session.ts
├── schema.ts
├── sequencing.ts
├── signals.ts
├── timecode.ts
└── transitions.ts

## C: Type Definitions
(Extracted from index.ts exports - simplified)
- HeliosState
- HeliosOptions
- HeliosSubscriber
- TimeDriver
- AudioTrackMetadata
- AudioTrackState
- CaptionCue
- Marker
- HeliosSchema
- PropDefinition
- DiagnosticReport

## D: Public Methods
// Helios Class
class Helios {
  constructor(options: HeliosOptions);
  getState(): Readonly<HeliosState>;
  setSize(width: number, height: number): void;
  setLoop(shouldLoop: boolean): void;
  setDuration(seconds: number): void;
  setFps(fps: number): void;
  setInputProps(props: TInputProps): void;
  setPlaybackRate(rate: number): void;
  setAudioVolume(volume: number): void;
  setAudioMuted(muted: boolean): void;
  setAudioTrackVolume(trackId: string, volume: number): void;
  setAudioTrackMuted(trackId: string, muted: boolean): void;
  setAvailableAudioTracks(tracks: AudioTrackMetadata[]): void;
  setCaptions(captions: string | CaptionCue[]): void;
  setMarkers(markers: Marker[]): void;
  addMarker(marker: Marker): void;
  removeMarker(id: string): void;
  seekToMarker(id: string): void;
  seekToTime(seconds: number): void;
  setPlaybackRange(startFrame: number, endFrame: number): void;
  clearPlaybackRange(): void;
  subscribe(callback: HeliosSubscriber): () => void;
  unsubscribe(callback: HeliosSubscriber): void;
  registerStabilityCheck(check: StabilityCheck): () => void;
  play(): void;
  pause(): void;
  seek(frame: number): void;
  waitUntilStable(): Promise<void>;
  bindTo(master: Helios): void;
  unbind(): void;
  bindToDocumentTimeline(): void;
  unbindFromDocumentTimeline(): void;
  dispose(): void;
  static diagnose(): Promise<DiagnosticReport>;
  getAudioContext(): Promise<unknown>;
  getAudioSourceNode(trackId: string): Promise<unknown>;
}
