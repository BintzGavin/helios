# Context: CORE

## A. Architecture
The Core package implements the "Helios State Machine" pattern:
- **State Store**: Centralized state (HeliosState) managed via Signals.
- **Actions**: Public methods on the Helios class modify state.
- **Subscribers**: External components (Renderer, Studio) subscribe to state changes.
- **Drivers**: TimeDrivers (DomDriver, etc.) sync external time sources (WAAPI, Audio) with internal frame state.

## B. File Tree
packages/core/src/
├── drivers/
│   ├── DomDriver.ts
│   ├── index.ts
│   └── ...
├── animation.ts
├── captions.ts
├── color.ts
├── easing.ts
├── errors.ts
├── index.ts
├── markers.ts
├── random.ts
├── schema.ts
├── sequencing.ts
├── signals.ts
├── timecode.ts
└── transitions.ts

## C. Type Definitions
```typescript
export interface HeliosState {
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
}

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

export interface SpringConfig {
  mass?: number;
  stiffness?: number;
  damping?: number;
  overshootClamping?: boolean;
}

export interface SpringOptions {
  frame: number;
  fps: number;
  config?: SpringConfig;
  from?: number;
  to?: number;
  durationInFrames?: number;
}
```

## D. Public Methods (Helios Class)
```typescript
class Helios {
  constructor(options: HeliosOptions);

  // Getters (Signals)
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

  // Actions
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

  // Playback
  play(): void;
  pause(): void;
  seek(frame: number): void;
  waitUntilStable(): Promise<void>;

  // Timeline Binding
  bindToDocumentTimeline(): void;
  unbindFromDocumentTimeline(): void;

  // Subscription
  subscribe(callback: HeliosSubscriber): () => void;
  unsubscribe(callback: HeliosSubscriber): void;

  // Lifecycle
  dispose(): void;

  static diagnose(): Promise<DiagnosticReport>;
}
```

## E. Exported Utilities (Selected)
```typescript
// Animation
function spring(options: SpringOptions): number;
function calculateSpringDuration(options: Omit<SpringOptions, 'frame'>, threshold?: number): number;
function interpolate(input: number, inputRange: number[], outputRange: number[], options?: InterpolateOptions): number;
```
