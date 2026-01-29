# Core Domain Context

## A. Architecture

**Helios State Machine**
The Core domain implements the "Helios State Machine" pattern.
1.  **Store**: The `Helios` class holds the application state (e.g., `currentFrame`, `isPlaying`, `duration`) using reactive Signals.
2.  **Actions**: Public methods (e.g., `play()`, `seek()`, `setDuration()`) modify these internal signals.
3.  **Subscribers**: External consumers subscribe to state changes via `helios.subscribe()`. The state is exposed as a read-only snapshot.
4.  **Drivers**: A `TimeDriver` strategy manages synchronization with the environment (e.g., `DomDriver` for WAAPI/MediaElements, `NoopDriver` for headless).

## B. File Tree

```
packages/core/src/
├── drivers/           # TimeDriver implementations (DomDriver, etc.)
├── animation.ts       # Animation utilities
├── captions.ts        # SRT parsing and caption logic
├── color.ts           # Color parsing and interpolation
├── easing.ts          # Easing functions
├── errors.ts          # Structured error classes
├── index.ts           # Main entry point and Helios class
├── markers.ts         # Timeline marker logic
├── random.ts          # Deterministic PRNG
├── schema.ts          # Schema validation logic
├── sequencing.ts      # Sequencing primitives
├── signals.ts         # Reactive signal implementation
├── timecode.ts        # Timecode conversion utilities
└── transitions.ts     # Transition effects
```

## C. Type Definitions

```typescript
// From index.ts
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

// From schema.ts
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
  items?: PropDefinition;
  properties?: HeliosSchema;
}

export type HeliosSchema = Record<string, PropDefinition>;

// From captions.ts
export interface CaptionCue {
  id: string;
  startTime: number; // in milliseconds
  endTime: number;   // in milliseconds
  text: string;
}

// From markers.ts
export interface Marker {
  id: string;
  time: number; // in seconds
  label: string;
  color?: string; // hex code
}
```

## D. Public Methods

```typescript
export class Helios {
  // Readonly Signals
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
