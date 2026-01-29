# Architectural Context: Core

## A. Architecture

The Core package (`@helios-project/core`) is the pure TypeScript logic engine for Helios. It manages state, time, and synchronization without depending on any rendering environment (DOM, Canvas, etc.).

**Pattern: Signals & Drivers**
- **State**: Managed via signals (`_currentFrame`, `_isPlaying`, etc.), exposed as `ReadonlySignal` getters for reactive UI updates.
- **Time**: Time is advanced by a `Ticker` (RAF or Timeout) and synchronized via a `TimeDriver` (DOM, WAAPI, or No-op).
- **Synchronization**: The `Helios` instance can drive time (`play()`) or be driven by an external timeline (`bindToDocumentTimeline()`).

## B. File Tree

```
packages/core/src/
├── drivers/           # TimeDriver implementations (DomDriver, etc.)
├── animation.ts       # Animation loop logic
├── captions.ts        # SRT parsing and active cue logic
├── color.ts           # Color interpolation utilities
├── easing.ts          # Easing functions
├── errors.ts          # Structured error definitions
├── index.ts           # Public API entry point (Helios class)
├── markers.ts         # Timeline marker logic
├── random.ts          # Deterministic PRNG
├── schema.ts          # Input property schema validation
├── sequencing.ts      # Sequence/Series helpers
├── signals.ts         # Reactive signal implementation
├── timecode.ts        # Timecode conversion utilities
└── transitions.ts     # Transition helpers
```

## C. Type Definitions

```typescript
// index.ts
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

// schema.ts
export type PropType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'color' | 'image' | 'video' | 'audio' | 'font';

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

// markers.ts
export interface Marker {
  id: string;
  time: number; // seconds
  label?: string;
  color?: string;
}

// captions.ts
export interface CaptionCue {
  id: string;
  start: number;
  end: number;
  text: string;
}
```

## D. Public Methods

```typescript
class Helios {
  // Static
  static diagnose(): Promise<DiagnosticReport>;

  // Getters (ReadonlySignal)
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

  // Lifecycle
  constructor(options: HeliosOptions);
  dispose(): void;

  // State
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

  // Subscription
  subscribe(callback: HeliosSubscriber): () => void;
  unsubscribe(callback: HeliosSubscriber): void;
  registerStabilityCheck(check: StabilityCheck): () => void;

  // Playback
  play(): void;
  pause(): void;
  seek(frame: number): void;
  waitUntilStable(): Promise<void>;

  // Synchronization
  bindToDocumentTimeline(): void;
  unbindFromDocumentTimeline(): void;
}
```
