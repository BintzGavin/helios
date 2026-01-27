# Module Context: PLAYER

## 1. Module Overview
- **Package**: `@helios-project/player`
- **Domain**: Web Component and Player UI
- **Responsibility**: Renders the `<helios-player>` component, managing the preview iframe, UI controls, and communication bridge.

## 2. Key Components

### A. Component Structure
- **Shadow DOM**:
  - `<iframe>`: Renders the user's composition (sandboxed).
  - `.poster-container`: Overlay displaying custom preview image and play button (when `preload="none"`).
  - `.status-overlay`: Displays loading/error states.
  - `.controls`: Overlay UI for playback (play, seek, volume, speed, fullscreen, captions, export).
  - `.captions-container`: Overlay for rendering burn-in style captions during preview.

### B. Events (Dispatched by `<helios-player>`)
- `play`: Fired when playback starts.
- `pause`: Fired when playback pauses.
- `ended`: Fired when playback reaches the end.
- `timeupdate`: Fired when the current frame changes.
- `volumechange`: Fired when volume or mute state changes.
- `ratechange`: Fired when playback rate changes.
- `durationchange`: Fired when duration changes.

### C. Attributes
- `src`: URL of the composition to load in the iframe.
- `width`: Aspect ratio width.
- `height`: Aspect ratio height.
- `autoplay`: Auto-start playback on load.
- `loop`: Loop playback.
- `controls`: Show/hide default UI controls.
- `poster`: URL of the poster image to display before loading.
- `preload`: `auto` | `none`. Defaults to `auto`. If `none`, defers iframe loading.
- `export-mode`: `auto` | `canvas` | `dom` (default: `auto`).
- `canvas-selector`: CSS selector for the canvas element (default: `canvas`).
- `export-format`: `mp4` | `webm` (default: `mp4`).
- `input-props`: JSON string of dynamic properties to pass to the composition.

## 3. Interfaces & Public API

### HeliosController
```typescript
interface HeliosController {
  play(): void;
  pause(): void;
  seek(frame: number): void;
  setAudioVolume(volume: number): void;
  setAudioMuted(muted: boolean): void;
  setPlaybackRate(rate: number): void;
  setInputProps(props: Record<string, any>): void;
  subscribe(callback: (state: any) => void): () => void;
  getState(): any;
  dispose(): void;
  captureFrame(frame: number, options?: CaptureOptions): Promise<{ frame: VideoFrame, captions: CaptionCue[] } | null>;
  getAudioTracks(): Promise<AudioAsset[]>;
}
```

### Bridge Protocol
- **Parent -> Iframe**:
  - `HELIOS_CONNECT`, `HELIOS_PLAY`, `HELIOS_PAUSE`, `HELIOS_SEEK`
  - `HELIOS_SET_VOLUME`, `HELIOS_SET_MUTED`, `HELIOS_SET_PLAYBACK_RATE`
  - `HELIOS_SET_PROPS`, `HELIOS_CAPTURE_FRAME`, `HELIOS_GET_AUDIO_TRACKS`
- **Iframe -> Parent**:
  - `HELIOS_READY`, `HELIOS_STATE`
  - `HELIOS_FRAME_DATA` (includes `bitmap` and `captions`)
  - `HELIOS_AUDIO_DATA`

## 4. Dependencies
- **Internal**: `@helios-project/core` (types, `Helios` class for Direct mode).
- **External**: `mp4-muxer`, `webm-muxer`.
