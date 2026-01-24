# Context: Core (Logic Engine)

## A. Architecture
The Helios Core (`packages/core`) implements a framework-agnostic **State Machine** pattern.
1. **Store**: Holds the source of truth (`HeliosState`: `currentFrame`, `isPlaying`, `fps`, `duration`).
2. **Actions**: Methods like `play()`, `pause()`, `seek()` mutate the state.
3. **Subscribers**: External consumers (UI, Renderer) subscribe to state changes to update their view.

This design allows the Core to be "Headless" and driver-agnostic (it can be driven by `requestAnimationFrame`, `document.timeline`, or manual seeking).

## B. File Tree
```
packages/core/src/
├── index.ts      # Main entry point (Helios class, types)
├── index.test.ts # Unit tests
```

## C. Type Definitions
```typescript
type HeliosState = {
  duration: number;
  fps: number;
  currentFrame: number;
  isPlaying: boolean;
  inputProps: Record<string, any>;
};

type Subscriber = (state: HeliosState) => void;

interface HeliosOptions {
  duration: number; // in seconds
  fps: number;
  autoSyncAnimations?: boolean;
  animationScope?: HTMLElement;
  inputProps?: Record<string, any>;
}

interface DiagnosticReport {
  waapi: boolean;
  webCodecs: boolean;
  offscreenCanvas: boolean;
  userAgent: string;
}
```

## D. Public Methods (Helios Class)
```typescript
class Helios {
  // Static Diagnostics
  static diagnose(): Promise<DiagnosticReport>;

  // Lifecycle
  constructor(options: HeliosOptions);

  // State Access
  getState(): Readonly<HeliosState>;

  setInputProps(props: Record<string, any>): void;

  // Subscription
  subscribe(callback: Subscriber): () => void;
  unsubscribe(callback: Subscriber): void;

  // Playback Controls
  play(): void;
  pause(): void;
  seek(frame: number): void;

  // External Timeline Sync (for Renderer/DevTools)
  bindToDocumentTimeline(): void;
  unbindFromDocumentTimeline(): void;
}
```
