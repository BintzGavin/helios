# Core Context

## A. Architecture

The `packages/core` module implements a **Headless Logic Engine** for video composition. It follows a "State Machine" pattern where the `Helios` class maintains the source of truth for:
- `currentFrame`
- `isPlaying`
- `duration`
- `fps`
- `inputProps`
- `playbackRate`

State changes are propagated to subscribers via an Observer pattern (`subscribe()`). Time advancement is handled by an abstracted `TimeDriver` strategy, allowing the engine to drive different environments (WAAPI for preview, No-op for testing, etc.).

## B. File Tree

```
packages/core/src/
├── animation.ts
├── drivers/
│   ├── index.ts
│   ├── TimeDriver.ts
│   ├── WaapiDriver.ts
│   └── NoopDriver.ts
├── index.ts
├── sequencing.ts
└── sequencing.test.ts
```

## C. Type Definitions

```typescript
export interface HeliosOptions {
  duration: number; // in seconds
  fps: number;
  autoSyncAnimations?: boolean;
  animationScope?: HTMLElement;
  inputProps?: Record<string, any>;
  playbackRate?: number;
  driver?: TimeDriver;
}

export interface DiagnosticReport {
  waapi: boolean;
  webCodecs: boolean;
  offscreenCanvas: boolean;
  userAgent: string;
}

export interface TimeDriver {
  init(scope: HTMLElement | Document): void;
  update(timeInMs: number): void;
}

export interface InterpolateOptions {
  extrapolateLeft?: ExtrapolateType;
  extrapolateRight?: ExtrapolateType;
  easing?: (t: number) => number;
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

export interface SequenceOptions {
  frame: number;
  from: number;
  durationInFrames?: number;
}

export interface SequenceResult {
  localFrame: number;
  relativeFrame: number;
  progress: number;
  isActive: boolean;
}
```

## D. Public Methods

```typescript
// Helios Class
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

// Animation Helpers
function interpolate(input: number, inputRange: number[], outputRange: number[], options?: InterpolateOptions): number;
function spring(options: SpringOptions): number;

// Sequencing
function sequence(options: SequenceOptions): SequenceResult;
```
