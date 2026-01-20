# Context: Core Logic Engine (`packages/core`)

## A. Architecture
The Core package implements the **Helios State Machine**, serving as the single source of truth for time and animation state.
- **Store**: Holds `frame`, `time`, `fps`, `duration`, `isPlaying`.
- **Actions**: Methods like `seek()`, `play()`, `pause()` modify the store.
- **Subscribers**: Components (Player, Renderer) subscribe to state changes to update their views.

## B. File Tree
packages/core/src/
├── animation-helpers.ts
├── index.test.ts
└── index.ts

## C. Type Definitions
```typescript
type HeliosState = {
  duration: number;
  fps: number;
  currentFrame: number;
  isPlaying: boolean;
};

type Subscriber = (state: HeliosState) => void;

interface HeliosOptions {
  duration: number; // in seconds
  fps: number;
  autoSyncAnimations?: boolean;
  animationScope?: HTMLElement;
}

export interface AnimationTiming {
  startTime: number;
  endTime: number;
  totalDuration: number;
}

export interface AnimationState {
  progress: number;
  isActive: boolean;
  isComplete: boolean;
}
```

## D. Public Methods (Helios Class)
```typescript
export class Helios {
  constructor(options: HeliosOptions);

  // State Management
  public getState(): Readonly<HeliosState>;

  // Subscription
  public subscribe(callback: Subscriber): () => void;
  public unsubscribe(callback: Subscriber): void;

  // Playback Controls
  public play(): void;
  public pause(): void;
  public seek(frame: number): void;

  // Timeline Synchronization
  public bindToDocumentTimeline(): void;
  public unbindFromDocumentTimeline(): void;
}
```
