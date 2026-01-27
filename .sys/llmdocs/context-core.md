# Core Context

## A. Architecture

The Core package follows a **Helios State Machine** pattern:
1.  **Store**: Holds the state (current frame, playback status, inputs) using signals.
2.  **Actions**: Methods on the `Helios` class (e.g., `play()`, `seek()`) that modify the state.
3.  **Subscribers**: External components subscribe to state changes to update the UI or rendering.
4.  **Drivers**: Strategies for syncing the internal time with the environment (e.g., `DomDriver` for WAAPI/MediaElements).

## B. File Tree

```
packages/core/src/
├── animation.ts
├── audio.ts
├── captions.ts
├── color.ts
├── drivers/
│   ├── DomDriver.ts
│   ├── NoopDriver.ts
│   ├── RafTicker.ts
│   ├── TimeoutTicker.ts
│   ├── WaapiDriver.ts
│   ├── index.ts
│   └── types.ts
├── easing.ts
├── errors.ts
├── index.ts
├── markers.ts
├── node-runtime.ts
├── random.ts
├── schema.ts
├── sequencing.ts
├── signals.ts
├── timecode.ts
```

## C. Type Definitions

```typescript
export type PropType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'color'
  | 'image'
  | 'video'
  | 'audio'
  | 'font';

export interface PropDefinition {
  type: PropType;
  optional?: boolean;
  default?: any;
  minimum?: number;
  maximum?: number;
  enum?: (string | number)[];
  label?: string;
  description?: string;
}

export type HeliosSchema = Record<string, PropDefinition>;

export interface CaptionCue {
  id: string;
  startTime: number; // in milliseconds
  endTime: number; // in milliseconds
  text: string;
}

export interface Marker {
  id: string;
  time: number; // in seconds
  label: string;
  color?: string; // hex
}

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
};

export type HeliosSubscriber = (state: HeliosState) => void;

export interface HeliosOptions {
  width?: number;
  height?: number;
  initialFrame?: number;
  duration: number; // in seconds
  fps: number;
  loop?: boolean;
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
```

## D. Public Methods

```typescript
export class Helios {
  static diagnose(): Promise<DiagnosticReport>;
  constructor(options: HeliosOptions);

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

  subscribe(callback: HeliosSubscriber): () => void;
  unsubscribe(callback: HeliosSubscriber): void;

  play(): void;
  pause(): void;
  seek(frame: number): void;

  bindToDocumentTimeline(): void;
  unbindFromDocumentTimeline(): void;
  dispose(): void;

  // Signals are also exposed as readonly properties (e.g. currentFrame, isPlaying, etc.)
}
```
