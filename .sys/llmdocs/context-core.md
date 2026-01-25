# Core Domain Context

## A. Architecture
The **Core** domain implements the "Headless Logic Engine" of Helios. It is a pure TypeScript library with zero dependencies that manages the state of the composition (frame, duration, fps, input props) and drives the animation timeline.
It follows a **Store -> Actions -> Subscribers** pattern:
- **Store**: `HeliosState` holds the source of truth (currentFrame, isPlaying, inputProps, etc).
- **Actions**: Public methods on the `Helios` class (e.g. `seek`, `play`, `setInputProps`) mutate the state.
- **Subscribers**: The UI or Renderer subscribes to state changes to update the view.
It also provides pure math helpers for animation (`interpolate`, `spring`).

## B. File Tree
```
packages/core/src/
├── animation.test.ts
├── animation.ts       # Animation helpers (interpolate, spring)
├── index.test.ts
└── index.ts           # Main entry point, Helios class
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
}

export interface DiagnosticReport {
  waapi: boolean;
  webCodecs: boolean;
  offscreenCanvas: boolean;
  userAgent: string;
}

export type ExtrapolateType = 'extend' | 'clamp' | 'identity';

export interface InterpolateOptions {
  extrapolateLeft?: ExtrapolateType;
  extrapolateRight?: ExtrapolateType;
  easing?: (t: number) => number;
}

export interface SpringConfig {
  mass?: number;      // default: 1
  stiffness?: number; // default: 100
  damping?: number;   // default: 10
  overshootClamping?: boolean; // default: false
}

export interface SpringOptions {
  frame: number;
  fps: number;
  config?: SpringConfig;
  from?: number; // default: 0
  to?: number;   // default: 1
  /**
   * Optional duration hint.
   * Note: Physics simulations are time-based and do not have a fixed duration.
   * This property is currently ignored by the spring function.
   */
  durationInFrames?: number;
}
```

## D. Public Methods
```typescript
export class Helios {
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

export function interpolate(
  input: number,
  inputRange: number[],
  outputRange: number[],
  options?: InterpolateOptions
): number;

export function spring(options: SpringOptions): number;
```
