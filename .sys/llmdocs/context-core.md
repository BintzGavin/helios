# Context: Core

## Section A: Architecture
The Core package implements the "Helios State Machine" pattern. It serves as the single source of truth for time and state (Store -> Actions -> Subscribers). It is fully headless and does not depend on the DOM for its logic, although it can bind to `document.timeline`.

## Section B: File Tree
packages/core/src/
├── index.test.ts
├── index.ts

## Section C: Type Definitions
### exported from index.ts
- type HeliosState = { duration: number; fps: number; currentFrame: number; isPlaying: boolean; };
- type Subscriber = (state: HeliosState) => void;
- interface HeliosOptions { duration: number; fps: number; autoSyncAnimations?: boolean; animationScope?: HTMLElement; }
- interface DiagnosticReport { waapi: boolean; webCodecs: boolean; offscreenCanvas: boolean; userAgent: string; }

## Section D: Public Methods
class Helios {
  static diagnose(): Promise<DiagnosticReport>;
  constructor(options: HeliosOptions);
  getState(): Readonly<HeliosState>;
  subscribe(callback: Subscriber): () => void;
  unsubscribe(callback: Subscriber): void;
  play(): void;
  pause(): void;
  seek(frame: number): void;
  bindToDocumentTimeline(): void;
  unbindFromDocumentTimeline(): void;
}
