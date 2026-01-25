# Context: CORE

## A. Architecture

Helios Core is a headless logic engine for programmatic video creation. It manages:
- **State**: Current frame, playback state, and input properties using reactive Signals.
- **Timing**: Abstracted via `TimeDriver` and `Ticker` to support Browser (RAF), Node, and WAAPI.
- **Animation**: Provides primitives (`interpolate`, `spring`) and sequencing (`sequence`, `series`).

## B. File Tree

packages/core/src/
├── drivers/
│   ├── ManualTicker.ts
│   ├── NoopDriver.ts
│   ├── RafTicker.ts
│   ├── Ticker.ts
│   ├── TimeDriver.ts
│   ├── WaapiDriver.ts
│   └── index.ts
├── animation.ts
├── easing.ts
├── index.ts
├── sequencing.ts
└── signals.ts

## C. Type Definitions

```typescript
// index.ts
interface HeliosOptions {
  duration: number;
  fps: number;
  autoSyncAnimations?: boolean;
  animationScope?: HTMLElement;
  inputProps?: Record<string, any>;
  playbackRate?: number;
  driver?: TimeDriver;
  ticker?: Ticker;
}

interface DiagnosticReport {
  waapi: boolean;
  webCodecs: boolean;
  offscreenCanvas: boolean;
  userAgent: string;
}

// sequencing.ts
interface SequenceOptions {
  frame: number;
  from: number;
  durationInFrames?: number;
}

interface SequenceResult {
  localFrame: number;
  relativeFrame: number;
  progress: number;
  isActive: boolean;
}

interface SeriesItem {
  durationInFrames: number;
  offset?: number;
}

// animation.ts
interface InterpolateOptions {
  extrapolateLeft?: 'extend' | 'clamp' | 'identity';
  extrapolateRight?: 'extend' | 'clamp' | 'identity';
  easing?: (t: number) => number;
}

interface SpringConfig {
  mass?: number;
  stiffness?: number;
  damping?: number;
  overshootClamping?: boolean;
}

interface SpringOptions {
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
  readonly duration: number;
  readonly fps: number;

  // Signals
  readonly currentFrame: ReadonlySignal<number>;
  readonly isPlaying: ReadonlySignal<boolean>;
  readonly inputProps: ReadonlySignal<Record<string, any>>;
  readonly playbackRate: ReadonlySignal<number>;

  static diagnose(): Promise<DiagnosticReport>;

  constructor(options: HeliosOptions);

  getState(): Readonly<HeliosState>;
  setInputProps(props: Record<string, any>): void;
  setPlaybackRate(rate: number): void;
  subscribe(callback: Subscriber): () => void;
  unsubscribe(callback: Subscriber): void;
  play(): void;
  pause(): void;
  seek(frame: number): void;
  bindToDocumentTimeline(): void;
  unbindFromDocumentTimeline(): void;
}
```
