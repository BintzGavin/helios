# CORE Domain Context

## A. Architecture

The **Helios Core** follows a reactive, signal-based architecture pattern ("Helios State Machine"):

1.  **State (Signals)**: Internal state (current frame, playing status, volume, etc.) is managed using fine-grained reactive signals (`signal`, `computed`, `effect`). This ensures efficient updates and dependency tracking.
2.  **Controller (Helios Class)**: The `Helios` class acts as the central controller. It exposes state via ReadonlySignals and provides imperative methods (Actions) to modify that state (e.g., `seek()`, `play()`).
3.  **Drivers (TimeDriver)**: The abstract `TimeDriver` interface delegates environment-specific logic. The default `DomDriver` synchronizes the internal state with the DOM (HTMLMediaElements, WAAPI Animations), while the Renderer uses `SeekTimeDriver` or `CdpTimeDriver`.
4.  **Subscribers**: External consumers (UI, Renderer) subscribe to state changes via `helios.subscribe()`.
5.  **Virtual Time**: For frame-perfect rendering, `bindToDocumentTimeline` allows the internal clock to be driven by `window.__HELIOS_VIRTUAL_TIME__` or `document.timeline`, ensuring determinism.

## B. File Tree

```
packages/core/src/
├── drivers/
│   ├── DomDriver.ts        # Default browser driver (Media/WAAPI sync)
│   ├── NoopDriver.ts       # Headless/Test driver
│   └── TimeDriver.ts       # Interface definition
├── ai.ts                   # System prompt generation
├── animation.ts            # Animation primitives (interpolate)
├── captions.ts             # VTT/SRT parsing logic
├── color.ts                # Color parsing and interpolation
├── easing.ts               # Easing functions (linear, quad, etc.)
├── errors.ts               # Structured error definitions
├── Helios.ts               # Main class (State Machine)
├── index.ts                # Public exports
├── markers.ts              # Timeline marker logic
├── random.ts               # Deterministic PRNG
├── render-session.ts       # Frame iteration orchestration
├── schema.ts               # Prop validation and schema logic
├── sequencing.ts           # Sequencing helpers (series, sequence)
├── signals.ts              # Reactive signal implementation
├── timecode.ts             # Timecode conversion utilities
└── transitions.ts          # Transition helper functions
```

## C. Type Definitions

```typescript
// From index.ts & types.ts
export interface HeliosState {
  currentFrame: number;
  isPlaying: boolean;
  duration: number; // in seconds
  fps: number;
  playbackRate: number;
  width: number;
  height: number;
  captions: Caption[];
  activeCaptions: Caption[];
  markers: Marker[];
  activeMarkers: Marker[];
  volume: number;
  muted: boolean;
  availableAudioTracks: AudioTrackMetadata[];
  inputProps: Record<string, any>;
  playbackRange: [number, number] | null;
  error: HeliosError | null;
}

export interface HeliosOptions {
  fps?: number;
  duration?: number;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  loop?: boolean;
  driver?: TimeDriver;
  captions?: Caption[] | string[];
  markers?: Marker[];
  inputProps?: Record<string, any>;
  initialFrame?: number;
  availableAudioTracks?: AudioTrackMetadata[];
}

export type HeliosSubscriber = (state: HeliosState) => void;

export interface PropDefinition {
  type: PropType;
  default?: any;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[]; // for enum
  accept?: string[]; // for file
  format?: string; // e.g. 'color', 'date'
  pattern?: string; // regex
  group?: string;
  items?: PropDefinition; // for array
  properties?: Record<string, PropDefinition>; // for object
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
}

export type PropType = 'string' | 'number' | 'boolean' | 'color' | 'image' | 'video' | 'audio' | 'font' | 'json' | 'model' | 'shader' | 'array' | 'object';

export interface HeliosSchema {
  [key: string]: PropDefinition;
}

export interface AudioTrackMetadata {
  id: string;
  src: string;
  startTime: number;
  duration: number;
  fadeInDuration: number;
  fadeOutDuration: number;
  // Note: fadeEasing is an attribute implementation detail in DomDriver, not currently in metadata interface exposed to Studio, though it could be added later.
}
```

## D. Public Methods

```typescript
// Helios Class Public Signature
class Helios<T = Record<string, any>> {
  // Signals
  readonly currentFrame: ReadonlySignal<number>;
  readonly isPlaying: ReadonlySignal<boolean>;
  readonly duration: ReadonlySignal<number>;
  readonly fps: ReadonlySignal<number>;
  readonly playbackRate: ReadonlySignal<number>;
  readonly width: ReadonlySignal<number>;
  readonly height: ReadonlySignal<number>;
  readonly captions: ReadonlySignal<Caption[]>;
  readonly activeCaptions: ReadonlySignal<Caption[]>;
  readonly markers: ReadonlySignal<Marker[]>;
  readonly activeMarkers: ReadonlySignal<Marker[]>;
  readonly volume: ReadonlySignal<number>;
  readonly muted: ReadonlySignal<boolean>;
  readonly availableAudioTracks: ReadonlySignal<AudioTrackMetadata[]>;
  readonly inputProps: ReadonlySignal<T>;
  readonly playbackRange: ReadonlySignal<[number, number] | null>;
  readonly error: ReadonlySignal<HeliosError | null>;

  constructor(options?: HeliosOptions);

  // Control
  start(): void;
  stop(): void;
  pause(): void;
  seek(frame: number): void;
  seekToTime(time: number): void;

  // Configuration
  setSize(width: number, height: number): void;
  setDuration(seconds: number): void;
  setFps(fps: number): void;
  setCaptions(captions: Caption[] | string[]): void;
  setMarkers(markers: Marker[]): void;
  setPlaybackRange(startFrame: number, endFrame: number): void;
  clearPlaybackRange(): void;
  setInputProps(props: Partial<T>, schema?: HeliosSchema): void;
  setAvailableAudioTracks(tracks: AudioTrackMetadata[]): void;

  // Audio
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  setAudioTrackVolume(trackId: string, volume: number): void;
  setAudioTrackMuted(trackId: string, muted: boolean): void;
  getAudioContext(): Promise<unknown>;
  getAudioSourceNode(trackId: string): Promise<unknown>;

  // Sync & Lifecycle
  bindTo(master: Helios<any>): void;
  unbind(): void;
  bindToDocumentTimeline(): void;
  unbindFromDocumentTimeline(): void;
  dispose(): void;
  subscribe(callback: HeliosSubscriber): () => void;

  // Diagnostics
  static diagnose(): Promise<DiagnosticReport>;
  waitUntilStable(): Promise<void>;
  registerStabilityCheck(check: () => Promise<void>): void;
}
```
