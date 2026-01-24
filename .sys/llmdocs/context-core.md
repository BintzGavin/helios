# Context: CORE

## A. Architecture
The Core domain implements the "Helios State Machine" pattern.
- **Store**: The `Helios` class maintains `HeliosState` (frame, playback status, inputs, etc.).
- **Actions**: Public methods (e.g., `play`, `seek`, `setPlaybackRate`) modify the state.
- **Subscribers**: External components subscribe to state changes via `subscribe`.
- **Ticking**: The `tick` method runs on `requestAnimationFrame`, calculating frame advancements based on `performance.now()` delta time and `playbackRate`.
- **Helpers**: Pure functions like `interpolate` for animation logic.

## B. File Tree
```
packages/core/src/
├── animation.test.ts
├── animation.ts
├── index.test.ts
└── index.ts
```

## C. Type Definitions

```typescript
type HeliosState = {
  duration: number;
  fps: number;
  currentFrame: number;
  isPlaying: boolean;
  inputProps: Record<string, any>;
  playbackRate: number;
};

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
```

## D. Public Methods & Exports

```typescript
class Helios {
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
```
