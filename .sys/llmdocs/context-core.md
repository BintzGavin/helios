# Core Context

## A. Architecture

The Core package implements the "Helios State Machine" pattern. It is designed as a headless logic engine that manages the timeline, state, and synchronization, without containing any rendering logic.

1.  **Store**: The `Helios` class maintains the source of truth for all state (current frame, playback status, inputs, etc.) using fine-grained Signals.
2.  **Actions**: Public methods (e.g., `seek()`, `play()`, `setDuration()`) modify the signals.
3.  **Subscribers**: External consumers (Renderer, Player, Studio) subscribe to state changes or read signals directly to update their views.
4.  **Drivers**: Time synchronization is handled by pluggable `TimeDriver` strategies (e.g., `DomDriver` for Web Animations API, `WaapiDriver` for pure WAAPI, `NoopDriver` for headless).

## B. File Tree

```
packages/core/src/
├── drivers/
│   ├── index.ts
│   ├── DomDriver.ts
│   ├── WaapiDriver.ts
│   └── ...
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
export type HeliosState = {
  width: number;
  height: number;
  duration: number;
  fps: number;
  currentFrame: number;
  loop: boolean;
  isPlaying: boolean;
  inputProps: Record<string, any>;
  playbackRate: number;
  volume: number;
  muted: boolean;
  captions: CaptionCue[];
  activeCaptions: CaptionCue[];
  markers: Marker[];
  playbackRange: [number, number] | null;
};

export type HeliosSubscriber = (state: HeliosState) => void;

export type StabilityCheck = () => Promise<void>;

export interface HeliosOptions {
  width?: number;
  height?: number;
  initialFrame?: number;
  duration: number; // in seconds
  fps: number;
  loop?: boolean;
  playbackRange?: [number, number];
  autoSyncAnimations?: boolean;
  animationScope?: HTMLElement;
  inputProps?: Record<string, any>;
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
  userAgent: string;
}

export type PropType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'color'
  | 'image'
  | 'video'
  | 'audio'
  | 'font';

export interface PropDefinition {
  type: PropType;
  optional?: boolean;
  default?: any;
  minimum?: number;
  maximum?: number;
  enum?: (string | number)[];
  label?: string;
  description?: string;
  step?: number;
  format?: string;
  items?: PropDefinition;
  properties?: HeliosSchema;
}

export type HeliosSchema = Record<string, PropDefinition>;

export interface CaptionCue {
  id: string;
  start: number; // ms
  end: number;   // ms
  text: string;
}

export interface Marker {
  id: string;
  time: number; // seconds
  label?: string;
  color?: string;
}

export enum HeliosErrorCode {
  INVALID_DURATION = 'INVALID_DURATION',
  INVALID_FPS = 'INVALID_FPS',
  INVALID_PLAYBACK_RANGE = 'INVALID_PLAYBACK_RANGE',
  INVALID_INPUT_RANGE = 'INVALID_INPUT_RANGE',
  INVALID_OUTPUT_RANGE = 'INVALID_OUTPUT_RANGE',
  UNSORTED_INPUT_RANGE = 'UNSORTED_INPUT_RANGE',
  INVALID_SPRING_CONFIG = 'INVALID_SPRING_CONFIG',
  INVALID_SRT_FORMAT = 'INVALID_SRT_FORMAT',
  INVALID_INPUT_PROPS = 'INVALID_INPUT_PROPS',
  INVALID_RESOLUTION = 'INVALID_RESOLUTION',
  INVALID_COLOR_FORMAT = 'INVALID_COLOR_FORMAT',
  INVALID_TIMECODE_FORMAT = 'INVALID_TIMECODE_FORMAT',
  INVALID_MARKER = 'INVALID_MARKER',
  MARKER_NOT_FOUND = 'MARKER_NOT_FOUND',
  INVALID_SCHEMA = 'INVALID_SCHEMA'
}
```

## D. Public Methods

```typescript
class Helios {
  // Signals
  get currentFrame(): ReadonlySignal<number>;
  get loop(): ReadonlySignal<boolean>;
  get isPlaying(): ReadonlySignal<boolean>;
  get inputProps(): ReadonlySignal<Record<string, any>>;
  get playbackRate(): ReadonlySignal<number>;
  get volume(): ReadonlySignal<number>;
  get muted(): ReadonlySignal<boolean>;
  get captions(): ReadonlySignal<CaptionCue[]>;
  get activeCaptions(): ReadonlySignal<CaptionCue[]>;
  get markers(): ReadonlySignal<Marker[]>;
  get playbackRange(): ReadonlySignal<[number, number] | null>;
  get width(): ReadonlySignal<number>;
  get height(): ReadonlySignal<number>;
  get duration(): number;
  get fps(): number;

  static diagnose(): Promise<DiagnosticReport>;

  constructor(options: HeliosOptions);

  getState(): Readonly<HeliosState>;
  setSize(width: number, height: number): void;
  setLoop(shouldLoop: boolean): void;
  setDuration(seconds: number): void;
  setFps(fps: number): void;
  setInputProps(props: Record<string, any>): void;
  setPlaybackRate(rate: number): void;
  setAudioVolume(volume: number): void;
  setAudioMuted(muted: boolean): void;
  setCaptions(captions: string | CaptionCue[]): void;
  setMarkers(markers: Marker[]): void;
  addMarker(marker: Marker): void;
  removeMarker(id: string): void;
  seekToMarker(id: string): void;
  setPlaybackRange(startFrame: number, endFrame: number): void;
  clearPlaybackRange(): void;
  subscribe(callback: HeliosSubscriber): () => void;
  unsubscribe(callback: HeliosSubscriber): void;
  registerStabilityCheck(check: StabilityCheck): () => void;
  play(): void;
  pause(): void;
  seek(frame: number): void;
  waitUntilStable(): Promise<void>;
  bindToDocumentTimeline(): void;
  unbindFromDocumentTimeline(): void;
  dispose(): void;
}
```
