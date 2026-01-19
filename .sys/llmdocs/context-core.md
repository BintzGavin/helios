# Context: Core Logic Engine

## A. Architecture
The Helios Core is a **Framework-Agnostic State Machine**. It manages the "Truth of Time" for any animation.
- **Store**: Holds `currentFrame`, `fps`, `duration`, `isPlaying`.
- **Actions**: Methods like `seek()`, `play()`, `bindToDocumentTimeline()` mutate the store.
- **Subscribers**: Listen for state changes to update the view (Canvas, DOM, or Web Component).

## B. File Tree
```
packages/core/src/
├── animation-helpers.ts  # Animation control functions attached to window
├── index.test.ts         # Unit tests
└── index.ts              # Main entry point (Helios class)
```

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
}

interface AnimationTiming {
  startTime: number;
  endTime: number;
  totalDuration: number;
}

interface AnimationState {
  progress: number;
  isActive: boolean;
  isComplete: boolean;
}
```

## D. Public Methods
### `Helios` Class
```typescript
class Helios {
  constructor(options: HeliosOptions);

  // State Access
  getState(): Readonly<HeliosState>;

  // Subscription
  subscribe(callback: Subscriber): () => void;
  unsubscribe(callback: Subscriber): void;

  // Playback Controls
  play(): void;
  pause(): void;
  seek(frame: number): void;

  // Timeline Synchronization
  bindToDocumentTimeline(): void;
  unbindFromDocumentTimeline(): void;
}
```

### Animation Helpers
```typescript
function createAnimationController(): {
    updateAnimationProgress: (progress: number) => void;
    setAnimationTiming: (startTime: number, endTime: number, totalDuration: number) => void;
    updateAnimationAtTime: (currentTime: number, totalDuration: number) => void;
    timing: AnimationTiming;
};

function initializeAnimation(elementSelector?: string): ReturnType<typeof createAnimationController>;
```
