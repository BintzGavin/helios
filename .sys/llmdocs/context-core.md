# CORE Domain Context

## A. Architecture

The Core domain implements the **Helios State Machine**, a framework-agnostic engine for sequencing and animating content.

- **Store**: The `Helios` class manages internal state (frame, time, playback status) using reactive **Signals** (`_currentFrame`, `_isPlaying`, etc.).
- **Actions**: Public methods (`seek()`, `play()`, `setDuration()`) mutate these signals and trigger updates.
- **Subscribers**: The `subscribe()` method allows consumers (Renderers, UI) to listen for state changes efficiently.
- **Drivers**: The `TimeDriver` abstraction handles time advancement and synchronization with external systems (DOM `HTMLMediaElement`, Web Audio `AudioContext`, or Testing environments).

## B. File Tree

```
packages/core/src/
├── drivers/
│   ├── DomDriver.ts
│   ├── ManualTicker.ts
│   ├── NoopDriver.ts
│   ├── RafTicker.ts
│   ├── Ticker.ts
│   ├── TimeDriver.ts
│   ├── TimeoutTicker.ts
│   └── index.ts
├── Helios.ts
├── ai.ts
├── animation.ts
├── captions.ts
├── color.ts
├── easing.ts
├── errors.ts
├── index.ts
├── markers.ts
├── random.ts
├── render-session.ts
├── schema.ts
├── sequencing.ts
├── signals.ts
├── timecode.ts
└── transitions.ts
```

## C. Type Definitions

```typescript
export type HeliosState<TInputProps = Record<string, any>> = {
  width: number;
  height: number;
  duration: number;
  fps: number;
  currentFrame: number;
  loop: boolean;
  isPlaying: boolean;
  inputProps: TInputProps;
  playbackRate: number;
  volume: number;
  muted: boolean;
  audioTracks: Record<string, AudioTrackState>;
  availableAudioTracks: AudioTrackMetadata[];
  captions: CaptionCue[];
  activeCaptions: CaptionCue[];
  markers: Marker[];
  playbackRange: [number, number] | null;
  currentTime: number;
};

export type AudioTrackState = {
  volume: number;
  muted: boolean;
};

export interface AudioTrackMetadata {
  id: string;
  src: string;
  startTime: number;
  duration: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

export type HeliosSubscriber<TInputProps = Record<string, any>> = (state: HeliosState<TInputProps>) => void;

export type StabilityCheck = () => Promise<void>;

export interface HeliosOptions<TInputProps = Record<string, any>> {
  width?: number;
  height?: number;
  initialFrame?: number;
  duration: number; // in seconds
  fps: number;
  loop?: boolean;
  playbackRange?: [number, number];
  autoSyncAnimations?: boolean;
  animationScope?: unknown;
  inputProps?: TInputProps;
  schema?: HeliosSchema;
  playbackRate?: number;
  volume?: number;
  muted?: boolean;
  availableAudioTracks?: AudioTrackMetadata[];
  captions?: string | CaptionCue[];
  markers?: Marker[];
  driver?: TimeDriver;
  ticker?: Ticker;
}

export interface DiagnosticReport {
  waapi: boolean;
  webCodecs: boolean;
  offscreenCanvas: boolean;
  webgl: boolean;
  webgl2: boolean;
  webAudio: boolean;
  colorGamut: 'srgb' | 'p3' | 'rec2020' | null;
  videoCodecs: { h264: boolean; vp8: boolean; vp9: boolean; av1: boolean };
  audioCodecs: { aac: boolean; opus: boolean };
  videoDecoders: { h264: boolean; vp8: boolean; vp9: boolean; av1: boolean };
  audioDecoders: { aac: boolean; opus: boolean };
  userAgent: string;
}
```

## D. Public Methods

```typescript
// Signals
get currentFrame(): ReadonlySignal<number>;
get currentTime(): ReadonlySignal<number>;
get loop(): ReadonlySignal<boolean>;
get isPlaying(): ReadonlySignal<boolean>;
get inputProps(): ReadonlySignal<TInputProps>;
get playbackRate(): ReadonlySignal<number>;
get volume(): ReadonlySignal<number>;
get muted(): ReadonlySignal<boolean>;
get audioTracks(): ReadonlySignal<Record<string, AudioTrackState>>;
get availableAudioTracks(): ReadonlySignal<AudioTrackMetadata[]>;
get captions(): ReadonlySignal<CaptionCue[]>;
get activeCaptions(): ReadonlySignal<CaptionCue[]>;
get markers(): ReadonlySignal<Marker[]>;
get playbackRange(): ReadonlySignal<[number, number] | null>;
get width(): ReadonlySignal<number>;
get height(): ReadonlySignal<number>;
get duration(): ReadonlySignal<number>;
get fps(): ReadonlySignal<number>;

// Audio Visualization
getAudioContext(): Promise<unknown>;
getAudioSourceNode(trackId: string): Promise<unknown>;

// State Mutation
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

// Subscription & Sync
subscribe(callback: HeliosSubscriber<TInputProps>): () => void;
unsubscribe(callback: HeliosSubscriber<TInputProps>): void;
bindTo(master: Helios<any>): void;
unbind(): void;
bindToDocumentTimeline(): void;
unbindFromDocumentTimeline(): void;

// Stability
registerStabilityCheck(check: StabilityCheck): () => void;
waitUntilStable(): Promise<void>;

// Controls
play(): void;
pause(): void;
seek(frame: number): void;
dispose(): void;

// Static
static diagnose(): Promise<DiagnosticReport>;
```
