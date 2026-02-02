# Core Context

## Section A: Architecture

The Core package implements a "Helios State Machine" pattern.

1.  **State Store**: The `Helios` class holds the reactive state (using signals) for time, dimensions, playback status, and metadata.
2.  **Actions**: Public methods (e.g., `seek`, `play`, `setInputProps`) modify this internal state.
3.  **Subscribers**: External consumers (Renderer, Player) subscribe to state changes.
4.  **Drivers**: The `TimeDriver` interface abstracts the synchronization with the underlying environment (DOM, WAAPI, or no-op). The `DomDriver` specifically syncs HTMLMediaElements and Web Animations API with the Helios internal time.

## Section B: File Tree

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

## Section C: Type Definitions

```typescript
export interface AudioTrackMetadata {
  id: string;
  startTime: number;
  duration: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

export interface DriverMetadata {
  audioTracks?: AudioTrackMetadata[];
}

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
  videoCodecs: {
    h264: boolean;
    vp8: boolean;
    vp9: boolean;
    av1: boolean;
  };
  audioCodecs: {
    aac: boolean;
    opus: boolean;
  };
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
  userAgent: string;
}
```

## Section D: Public Methods

```typescript
export class Helios<TInputProps = Record<string, any>> {
  // Signals
  public get currentFrame(): ReadonlySignal<number>;
  public get currentTime(): ReadonlySignal<number>;
  public get loop(): ReadonlySignal<boolean>;
  public get isPlaying(): ReadonlySignal<boolean>;
  public get inputProps(): ReadonlySignal<TInputProps>;
  public get playbackRate(): ReadonlySignal<number>;
  public get volume(): ReadonlySignal<number>;
  public get muted(): ReadonlySignal<boolean>;
  public get audioTracks(): ReadonlySignal<Record<string, AudioTrackState>>;
  public get availableAudioTracks(): ReadonlySignal<AudioTrackMetadata[]>;
  public get captions(): ReadonlySignal<CaptionCue[]>;
  public get activeCaptions(): ReadonlySignal<CaptionCue[]>;
  public get markers(): ReadonlySignal<Marker[]>;
  public get playbackRange(): ReadonlySignal<[number, number] | null>;
  public get width(): ReadonlySignal<number>;
  public get height(): ReadonlySignal<number>;
  public get duration(): ReadonlySignal<number>;
  public get fps(): ReadonlySignal<number>;

  // Static
  static async diagnose(): Promise<DiagnosticReport>;

  // Constructor
  constructor(options: HeliosOptions<TInputProps>);

  // Methods
  public getState(): Readonly<HeliosState<TInputProps>>;
  public setSize(width: number, height: number): void;
  public setLoop(shouldLoop: boolean): void;
  public setDuration(seconds: number): void;
  public setFps(fps: number): void;
  public setInputProps(props: TInputProps): void;
  public setPlaybackRate(rate: number): void;
  public setAudioVolume(volume: number): void;
  public setAudioMuted(muted: boolean): void;
  public setAudioTrackVolume(trackId: string, volume: number): void;
  public setAudioTrackMuted(trackId: string, muted: boolean): void;
  public setCaptions(captions: string | CaptionCue[]): void;
  public setMarkers(markers: Marker[]): void;
  public addMarker(marker: Marker): void;
  public removeMarker(id: string): void;
  public seekToMarker(id: string): void;
  public seekToTime(seconds: number): void;
  public setPlaybackRange(startFrame: number, endFrame: number): void;
  public clearPlaybackRange(): void;
  public subscribe(callback: HeliosSubscriber<TInputProps>): () => void;
  public unsubscribe(callback: HeliosSubscriber<TInputProps>): void;
  public registerStabilityCheck(check: StabilityCheck): () => void;
  public play(): void;
  public pause(): void;
  public seek(frame: number): void;
  public async waitUntilStable(): Promise<void>;
  public bindTo(master: Helios<any>): void;
  public unbind(): void;
  public bindToDocumentTimeline(): void;
  public unbindFromDocumentTimeline(): void;
  public dispose(): void;
}
```
