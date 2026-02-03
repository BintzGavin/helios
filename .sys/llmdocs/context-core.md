# @helios-project/core

## A. Architecture

**Helios State Machine**
Helios uses a reactive state machine pattern based on signals to manage animation state and synchronization.

- **Store**: Internal state (e.g., `currentFrame`, `isPlaying`, `inputProps`) is held in atomic signals, ensuring fine-grained reactivity.
- **Actions**: Public methods (e.g., `play()`, `seek()`, `setInputProps()`) modify these signals, triggering updates.
- **Subscribers**: The `subscribe()` method follows the Observer pattern, allowing external consumers (like the UI or Renderer) to react to state changes synchronously.
- **Drivers**: The `TimeDriver` interface abstracts the underlying execution environment. The `DomDriver` synchronizes with the Web Animations API (WAAPI) and HTMLMediaElements, while other drivers can support headless or custom environments.
- **Virtual Time**: In headless rendering (CDP), Helios synchronizes with a shared virtual time source (`window.__HELIOS_VIRTUAL_TIME__`), allowing frame-perfect rendering across multiple instances.

## B. File Tree

```
packages/core/src/
├── Helios.ts
├── ai.ts
├── ai.test.ts
├── animation.ts
├── animation.test.ts
├── audio-state.test.ts
├── captions.ts
├── captions.test.ts
├── color.ts
├── color.test.ts
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
├── easing.test.ts
├── errors.ts
├── headless-audio.test.ts
├── helios-audio.test.ts
├── index.ts
├── index.test.ts
├── index-signals.test.ts
├── markers.ts
├── markers.test.ts
├── node-runtime.test.ts
├── random.ts
├── random.test.ts
├── render-session.ts
├── render-session.test.ts
├── schema.ts
├── schema.test.ts
├── sequencing.ts
├── sequencing.test.ts
├── signals.ts
├── signals.test.ts
├── signals-optimization.test.ts
├── stability.test.ts
├── subscription-timing.test.ts
├── time-control.test.ts
├── timecode.ts
├── timecode.test.ts
├── transitions.ts
├── transitions.test.ts
├── virtual-time.test.ts
└── worker-runtime.test.ts
```

## C. Type Definitions

```typescript
// From drivers/TimeDriver.ts
export interface AudioTrackMetadata {
  id: string;
  src: string;
  startTime: number;
  duration: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  fadeEasing?: string;
}

export interface DriverMetadata {
  audioTracks?: AudioTrackMetadata[];
}

export interface TimeDriver {
  init(scope: unknown): void;
  update(timeInMs: number, options?: {
    isPlaying: boolean;
    playbackRate: number;
    volume?: number;
    muted?: boolean;
    audioTracks?: Record<string, { volume: number; muted: boolean }>;
  }): void;
  waitUntilStable(): Promise<void>;
  dispose?(): void;
  subscribeToMetadata?(callback: (meta: DriverMetadata) => void): () => void;
  getAudioContext?(): Promise<unknown>;
  getAudioSourceNode?(trackId: string): Promise<unknown>;
}

// From Helios.ts
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
  audioTracks?: Record<string, AudioTrackState>;
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

// From schema.ts
export type PropType =
  | 'string' | 'number' | 'boolean' | 'object' | 'array' | 'color'
  | 'image' | 'video' | 'audio' | 'font' | 'model' | 'json' | 'shader'
  | 'int8array' | 'uint8array' | 'uint8clampedarray'
  | 'int16array' | 'uint16array'
  | 'int32array' | 'uint32array'
  | 'float32array' | 'float64array';

export interface PropDefinition {
  type: PropType;
  optional?: boolean;
  default?: any;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  enum?: (string | number)[];
  label?: string;
  description?: string;
  step?: number;
  format?: string;
  pattern?: string;
  accept?: string[];
  group?: string;
  items?: PropDefinition;
  properties?: HeliosSchema;
}

export type HeliosSchema = Record<string, PropDefinition>;

// From markers.ts
export interface Marker {
  id: string;
  time: number; // in seconds
  label?: string;
  color?: string;
  metadata?: Record<string, any>;
}

// From captions.ts
export interface CaptionCue {
  id?: string;
  startTime: number; // milliseconds
  endTime: number;   // milliseconds
  text: string;
  settings?: string;
}

// From signals.ts
export interface Signal<T> {
  value: T;
  peek(): T;
}

export interface ReadonlySignal<T> {
  readonly value: T;
  peek(): T;
}
```

## D. Public Methods

```typescript
// Helios Class
class Helios<TInputProps> {
  constructor(options: HeliosOptions<TInputProps>);

  // Readonly Signals
  get currentFrame(): ReadonlySignal<number>;
  get currentTime(): ReadonlySignal<number>;
  get loop(): ReadonlySignal<boolean>;
  get isPlaying(): ReadonlySignal<boolean>;
  get isVirtualTimeBound(): boolean;
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

  // State Access
  getState(): Readonly<HeliosState<TInputProps>>;
  getAudioContext(): Promise<unknown>;
  getAudioSourceNode(trackId: string): Promise<unknown>;

  // Configuration
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
  setPlaybackRange(startFrame: number, endFrame: number): void;
  clearPlaybackRange(): void;

  // Control
  play(): void;
  pause(): void;
  seek(frame: number): void;
  seekToTime(seconds: number): void;
  seekToMarker(id: string): void;

  // Subscription
  subscribe(callback: HeliosSubscriber<TInputProps>): () => void;
  unsubscribe(callback: HeliosSubscriber<TInputProps>): void;

  // Stability & Diagnostics
  registerStabilityCheck(check: StabilityCheck): () => void;
  waitUntilStable(): Promise<void>;
  static diagnose(): Promise<DiagnosticReport>;

  // Synchronization
  bindTo(master: Helios<any>): void;
  unbind(): void;
  bindToDocumentTimeline(): void;
  unbindFromDocumentTimeline(): void;

  // Cleanup
  dispose(): void;
}
```
